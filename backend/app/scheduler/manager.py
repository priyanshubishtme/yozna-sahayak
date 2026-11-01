"""APScheduler Job Orchestration & Discovery Runner.

Guarantees:
- Single scheduler instance runs only once per process lock.
- Per-source locking prevents concurrent overlapping runs.
- Compliance gate blocks prohibited/pending sources before any network activity.
- Complete job telemetry logged to discovery_runs and audit_events tables.
"""

import asyncio
from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import desc, select
from backend.app.config import settings
from backend.app.core.errors import AppException
from backend.app.core.logging import logger
from backend.app.discovery.diff import DiffEngine
from backend.app.discovery.storage import storage_service
from backend.app.db.base import utc_now
from backend.app.db.models import (
    AuditEvent,
    DiscoveryRun,
    FetchAttempt,
    ResourceCandidate,
    Source,
    SourceObservation
)
from backend.app.db.session import AsyncSessionLocal
from backend.app.scheduler.lock import process_lock, source_lock_manager
from backend.app.sources.base import PolicyViolationError
from backend.app.sources.compliance import ComplianceGate
from backend.app.sources.registry import get_adapter


class SchedulerManager:
    """Manages APScheduler lifecycle, scheduled source jobs, and manual Run Now execution."""

    def __init__(self):
        self.scheduler = AsyncIOScheduler(timezone=settings.timezone)
        self._is_running = False
        self._last_heartbeat = utc_now()

    def start(self) -> bool:
        """Starts the dedicated scheduler instance if process lock is acquired."""
        if not process_lock.acquire():
            logger.warning("Could not acquire scheduler process lock; running in passive worker mode.")
            return False

        if not self._is_running:
            self.scheduler.start()
            self._is_running = True
            self._last_heartbeat = utc_now()
            logger.info("Dedicated APScheduler instance started successfully.")
            return True
        return False

    def shutdown(self) -> None:
        """Stops the scheduler and releases lock."""
        if self._is_running:
            self.scheduler.shutdown(wait=False)
            self._is_running = False
            process_lock.release()
            logger.info("APScheduler stopped and lock released.")

    def pause(self) -> None:
        """Pauses all scheduled jobs."""
        if self._is_running:
            self.scheduler.pause()
            logger.info("APScheduler paused.")

    def resume(self) -> None:
        """Resumes scheduled jobs."""
        if self._is_running:
            self.scheduler.resume()
            logger.info("APScheduler resumed.")

    def get_status(self) -> Dict[str, Any]:
        """Returns scheduler telemetry and next execution times."""
        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append({
                "job_id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
            })

        return {
            "running": self._is_running,
            "paused": self.scheduler.state == 2 if self._is_running else False,
            "active_jobs_count": len(jobs),
            "jobs": jobs,
            "heartbeat": self._last_heartbeat.isoformat(),
            "process_mode": settings.scheduler_process_mode
        }

    async def reconcile_source_schedules(self) -> None:
        """Reads enabled approved sources from database and synchronizes cron jobs."""
        if not self._is_running:
            return

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Source).where(Source.enabled == True, Source.permission_status == "approved")
            )
            approved_sources = result.scalars().all()

        existing_job_ids = {j.id for j in self.scheduler.get_jobs()}
        active_source_ids = set()

        for source in approved_sources:
            job_id = f"source_job_{source.source_id}"
            active_source_ids.add(job_id)

            if job_id not in existing_job_ids:
                try:
                    trigger = CronTrigger.from_crontab(source.schedule_cron, timezone=settings.timezone)
                    self.scheduler.add_job(
                        func=self.run_source_job,
                        trigger=trigger,
                        id=job_id,
                        name=f"Discovery: {source.name}",
                        args=[source.source_id, "scheduled"],
                        coalesce=True,
                        max_instances=1,
                        misfire_grace_time=3600
                    )
                    logger.info(f"Scheduled source job '{job_id}' with cron '{source.schedule_cron}'.")
                except Exception as e:
                    logger.error(f"Failed to parse cron for source {source.source_id}: {e}")

        # Remove orphaned jobs for sources that were disabled
        for job_id in existing_job_ids:
            if job_id.startswith("source_job_") and job_id not in active_source_ids:
                self.scheduler.remove_job(job_id)
                logger.info(f"Removed deactivated source job '{job_id}'.")

    async def run_source_job(self, source_id: str, trigger_type: str = "manual") -> Dict[str, Any]:
        """Executes discovery and candidate creation for a single source.

        Guarantees:
        1. Compliance Gate evaluation before network call.
        2. Per-source locking against overlapping execution.
        3. Idempotent recording of observations, fetch attempts, and candidates.
        """
        self._last_heartbeat = utc_now()
        run_id = f"run-{uuid.uuid4().hex[:12]}"

        async with AsyncSessionLocal() as session:
            # 1. Fetch source
            res = await session.execute(select(Source).where(Source.source_id == source_id))
            source = res.scalar_one_or_none()

            if not source:
                raise AppException(
                    code="SOURCE_NOT_FOUND",
                    message=f"Source with ID '{source_id}' does not exist",
                    status_code=404
                )

            # 2. Compliance Gate Evaluation
            allowed, block_reason = ComplianceGate.can_run_automatically(source)
            if not allowed:
                # If scheduled or manual, record blocked attempt
                blocked_run = DiscoveryRun(
                    id=run_id,
                    source_id=source_id,
                    trigger_type=trigger_type,
                    status="failed",
                    error_message=f"Compliance Gate Block: {block_reason}",
                    started_at=utc_now(),
                    completed_at=utc_now()
                )
                session.add(blocked_run)
                await session.commit()

                logger.warning(f"Compliance block for {source_id}: {block_reason}")
                raise AppException(
                    code="COMPLIANCE_GATE_BLOCKED",
                    message=f"Source is blocked by policy: {block_reason}",
                    status_code=403
                )

            # 3. Acquire Per-Source Lock
            source_lock = await source_lock_manager.get_lock(source_id)
            if source_lock.locked():
                raise AppException(
                    code="SOURCE_JOB_ACTIVE",
                    message=f"A discovery job is already actively running for source '{source_id}'",
                    status_code=409
                )

            async with source_lock:
                # 4. Create running record
                run = DiscoveryRun(
                    id=run_id,
                    source_id=source_id,
                    trigger_type=trigger_type,
                    status="running",
                    started_at=utc_now()
                )
                session.add(run)
                await session.commit()

                adapter = get_adapter(source.adapter_key)
                pages_discovered = 0
                pages_fetched = 0
                candidates_created = 0

                try:
                    # 5. Run Discovery
                    discovered_resources = await adapter.discover(source)
                    pages_discovered = len(discovered_resources)
                    logger.info(f"Discovered {pages_discovered} resources for source {source_id}.")

                    # Apply max pages limit
                    to_fetch = discovered_resources[:source.max_pages_per_run]

                    for resource in to_fetch:
                        # Record observation
                        obs = SourceObservation(
                            id=f"obs-{uuid.uuid4().hex[:12]}",
                            source_id=source_id,
                            run_id=run_id,
                            observed_url=resource.url,
                            canonical_url=resource.canonical_url,
                            content_type=resource.content_type_hint,
                            status="discovered"
                        )
                        session.add(obs)

                        # 6. Fetch bytes
                        fetch_result = await adapter.fetch(resource)
                        pages_fetched += 1

                        attempt = FetchAttempt(
                            id=f"fetch-{uuid.uuid4().hex[:12]}",
                            run_id=run_id,
                            source_id=source_id,
                            url=resource.url,
                            http_status=fetch_result.status_code,
                            latency_ms=fetch_result.latency_ms,
                            content_type=fetch_result.content_type,
                            content_length=len(fetch_result.content_bytes),
                            binary_sha256=fetch_result.binary_sha256 if fetch_result.status_code == 200 else None,
                            error=fetch_result.error
                        )
                        session.add(attempt)

                        if fetch_result.status_code == 200 and fetch_result.content_bytes:
                            # 7. Persist raw bytes immutably in content-addressable storage
                            storage_service.store_bytes(
                                fetch_result.content_bytes,
                                fetch_result.content_type
                            )

                            # 8. Parse & Normalize
                            parsed_list = adapter.parse(fetch_result)
                            for parsed in parsed_list:
                                normalized = adapter.normalize(parsed)

                                # Store text snippet preview for fast diffing and UI inspection
                                storage_service.store_text_snippet(
                                    normalized.binary_sha256,
                                    normalized.extracted_text
                                )

                                # Check prior observations/candidates for this URL
                                prior_res = await session.execute(
                                    select(ResourceCandidate)
                                    .where(ResourceCandidate.canonical_url == normalized.canonical_url)
                                    .order_by(desc(ResourceCandidate.created_at))
                                )
                                prior_cands = prior_res.scalars().all()
                                has_prior = len(prior_cands) > 0
                                prior_cand = prior_cands[0] if has_prior else None

                                # Check if exact binary hash exists anywhere else
                                dup_res = await session.execute(
                                    select(ResourceCandidate)
                                    .where(ResourceCandidate.binary_sha256 == normalized.binary_sha256)
                                )
                                exact_binary_match = dup_res.scalars().first() is not None

                                # Classify using DiffEngine per Blueprint Section 4.4
                                classification = DiffEngine.classify_resource(
                                    is_known_url=has_prior,
                                    is_exact_binary_duplicate=exact_binary_match,
                                    has_prior_version=has_prior,
                                    old_binary_sha256=prior_cand.binary_sha256 if prior_cand else None,
                                    new_binary_sha256=normalized.binary_sha256,
                                    old_text_sha256=prior_cand.normalized_text_sha256 if prior_cand else None,
                                    new_text_sha256=normalized.normalized_text_sha256
                                )

                                # Per Blueprint Section 4.3: Unchanged is recorded; no duplicate pending candidate
                                if classification == "unchanged":
                                    logger.info(f"Resource {normalized.canonical_url} is unchanged (SHA-256 match).")
                                    continue

                                cand = ResourceCandidate(
                                    id=f"cand-{uuid.uuid4().hex[:12]}",
                                    source_id=source_id,
                                    run_id=run_id,
                                    canonical_url=normalized.canonical_url,
                                    original_url=normalized.original_url,
                                    content_type=normalized.content_type,
                                    binary_sha256=normalized.binary_sha256,
                                    normalized_text_sha256=normalized.normalized_text_sha256,
                                    title=normalized.title,
                                    issuer=normalized.issuer,
                                    detected_date=normalized.detected_date,
                                    classification=classification,
                                    review_status="pending_review",
                                    assigned_scheme_id=normalized.assigned_scheme_id
                                )
                                session.add(cand)
                                candidates_created += 1

                    # 9. Mark Run Completed
                    run.status = "completed"
                    run.pages_discovered = pages_discovered
                    run.pages_fetched = pages_fetched
                    run.candidates_created = candidates_created
                    run.completed_at = utc_now()

                    source.last_success_at = utc_now()
                    source.last_error_at = None
                    source.last_error_code = None

                    # Audit Event
                    audit = AuditEvent(
                        id=f"aud-{uuid.uuid4().hex[:12]}",
                        actor="scheduler_engine",
                        action="discovery_run_completed",
                        resource_type="discovery_run",
                        resource_id=run_id,
                        details_json={
                            "source_id": source_id,
                            "trigger_type": trigger_type,
                            "discovered": pages_discovered,
                            "fetched": pages_fetched,
                            "candidates": candidates_created
                        }
                    )
                    session.add(audit)
                    await session.commit()

                    logger.info(
                        f"Discovery run {run_id} completed successfully for {source_id} "
                        f"({candidates_created} candidates created)."
                    )

                    return {
                        "run_id": run_id,
                        "source_id": source_id,
                        "status": "completed",
                        "pages_discovered": pages_discovered,
                        "pages_fetched": pages_fetched,
                        "candidates_created": candidates_created
                    }

                except Exception as e:
                    run.status = "failed"
                    run.error_message = str(e)
                    run.completed_at = utc_now()

                    source.last_error_at = utc_now()
                    source.last_error_code = type(e).__name__

                    await session.commit()
                    logger.error(f"Discovery run {run_id} failed for {source_id}: {e}", exc_info=True)
                    raise AppException(
                        code="DISCOVERY_RUN_FAILED",
                        message=f"Discovery job failed: {str(e)}",
                        status_code=500
                    )


scheduler_manager = SchedulerManager()
