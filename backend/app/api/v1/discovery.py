"""Discovery jobs execution, manual Run Now triggers, and scheduler telemetry endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.envelope import success_response
from backend.app.core.errors import AppException
from backend.app.db.models import DiscoveryRun
from backend.app.db.session import get_db
from backend.app.scheduler.manager import scheduler_manager

router = APIRouter(prefix="/admin", tags=["Discovery & Scheduler"])


@router.post("/sources/{source_id}/discover")
async def trigger_manual_discovery(
    source_id: str,
    request: Request
):
    """Manually triggers a discovery run ('Run Now'). Gated by compliance policy and per-source lock."""
    request_id = getattr(request.state, "request_id", "direct")
    result = await scheduler_manager.run_source_job(source_id=source_id, trigger_type="manual")
    return success_response(data=result, request_id=request_id)


@router.get("/discovery/jobs")
async def list_discovery_jobs(
    request: Request,
    source_id: Optional[str] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Lists discovery run logs and telemetry."""
    request_id = getattr(request.state, "request_id", "direct")
    query = select(DiscoveryRun).order_by(desc(DiscoveryRun.created_at)).limit(limit)

    if source_id:
        query = query.where(DiscoveryRun.source_id == source_id)

    res = await db.execute(query)
    runs = res.scalars().all()

    items = [
        {
            "id": r.id,
            "source_id": r.source_id,
            "trigger_type": r.trigger_type,
            "status": r.status,
            "pages_discovered": r.pages_discovered,
            "pages_fetched": r.pages_fetched,
            "candidates_created": r.candidates_created,
            "error_message": r.error_message,
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in runs
    ]
    return success_response(data=items, request_id=request_id)


@router.get("/discovery/jobs/{job_id}")
async def get_discovery_job(
    job_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Retrieves full details and error message for a discovery run."""
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(select(DiscoveryRun).where(DiscoveryRun.id == job_id))
    r = res.scalar_one_or_none()

    if not r:
        raise AppException(code="JOB_NOT_FOUND", message=f"Discovery job '{job_id}' not found", status_code=404)

    data = {
        "id": r.id,
        "source_id": r.source_id,
        "trigger_type": r.trigger_type,
        "status": r.status,
        "pages_discovered": r.pages_discovered,
        "pages_fetched": r.pages_fetched,
        "candidates_created": r.candidates_created,
        "error_message": r.error_message,
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None
    }
    return success_response(data=data, request_id=request_id)


@router.get("/scheduler/status")
async def get_scheduler_status(request: Request):
    """Telemetry endpoint returning APScheduler state, active jobs, and heartbeat."""
    request_id = getattr(request.state, "request_id", "direct")
    status_data = scheduler_manager.get_status()
    return success_response(data=status_data, request_id=request_id)


@router.post("/scheduler/pause")
async def pause_scheduler(request: Request):
    """Pauses all scheduled source jobs."""
    request_id = getattr(request.state, "request_id", "direct")
    scheduler_manager.pause()
    return success_response(data={"message": "Scheduler paused"}, request_id=request_id)


@router.post("/scheduler/resume")
async def resume_scheduler(request: Request):
    """Resumes scheduled source jobs."""
    request_id = getattr(request.state, "request_id", "direct")
    scheduler_manager.resume()
    return success_response(data={"message": "Scheduler resumed"}, request_id=request_id)
