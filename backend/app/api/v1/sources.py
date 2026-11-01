"""Admin source registry, policy compliance reviews, and crawler controls."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from backend.app.core.envelope import success_response
from backend.app.core.errors import AppException
from backend.app.db.base import utc_now
from backend.app.db.models import AuditEvent, Source
from backend.app.db.session import get_db
from backend.app.scheduler.manager import scheduler_manager
from backend.app.sources.compliance import ComplianceGate, check_source_robots_txt

router = APIRouter(prefix="/admin/sources", tags=["Admin Sources"])


class SourceCreatePayload(BaseModel):
    source_id: str
    name: str
    base_url: str
    source_family: str
    jurisdiction: str = "IN"
    adapter_key: str = "ministry_listing_v1"
    fetch_mode: str = "requests"
    allowed_content_types: List[str] = ["text/html", "application/pdf"]
    schedule_cron: str = "0 3 * * *"
    notes: Optional[str] = None


class SourceUpdatePayload(BaseModel):
    name: Optional[str] = None
    schedule_cron: Optional[str] = None
    request_interval_seconds: Optional[int] = None
    max_pages_per_run: Optional[int] = None
    notes: Optional[str] = None


class PolicyReviewPayload(BaseModel):
    decision: str = Field(..., description="approved | pending_review | prohibited | written_authorization_required")
    reviewer: str = Field(..., description="Admin identifier")
    terms_url: Optional[str] = None
    written_authorization_reference: Optional[str] = None
    notes: Optional[str] = None
    verify_robots_txt: bool = True


@router.get("")
async def list_sources(request: Request, db: AsyncSession = Depends(get_db)):
    """Lists registered sources with compliance, policy states, and automation status."""
    request_id = getattr(request.state, "request_id", "direct")
    result = await db.execute(select(Source).order_by(Source.source_id))
    sources = result.scalars().all()

    items = []
    for s in sources:
        can_run, block_reason = ComplianceGate.can_run_automatically(s)
        items.append({
            "source_id": s.source_id,
            "name": s.name,
            "base_url": s.base_url,
            "source_family": s.source_family,
            "jurisdiction": s.jurisdiction,
            "language_hints": s.language_hints,
            "source_role": s.source_role,
            "adapter_key": s.adapter_key,
            "fetch_mode": s.fetch_mode,
            "allowed_content_types": s.allowed_content_types,
            "permission_status": s.permission_status,
            "automation_status": s.automation_status,
            "written_authorization_reference": s.written_authorization_reference,
            "robots_checked_at": s.robots_checked_at.isoformat() if s.robots_checked_at else None,
            "terms_checked_at": s.terms_checked_at.isoformat() if s.terms_checked_at else None,
            "terms_url": s.terms_url,
            "notes": s.notes,
            "schedule_cron": s.schedule_cron,
            "enabled": s.enabled,
            "can_run_automatically": can_run,
            "compliance_block_reason": block_reason,
            "last_success_at": s.last_success_at.isoformat() if s.last_success_at else None,
            "last_error_at": s.last_error_at.isoformat() if s.last_error_at else None,
            "last_error_code": s.last_error_code
        })

    return success_response(data=items, request_id=request_id)


@router.get("/{source_id}")
async def get_source(source_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Retrieves source record and compliance gate status."""
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(select(Source).where(Source.source_id == source_id))
    source = res.scalar_one_or_none()

    if not source:
        raise AppException(code="SOURCE_NOT_FOUND", message=f"Source '{source_id}' not found", status_code=404)

    can_run, block_reason = ComplianceGate.can_run_automatically(source)
    data = {
        "source_id": source.source_id,
        "name": source.name,
        "base_url": source.base_url,
        "source_family": source.source_family,
        "jurisdiction": source.jurisdiction,
        "adapter_key": source.adapter_key,
        "permission_status": source.permission_status,
        "automation_status": source.automation_status,
        "written_authorization_reference": source.written_authorization_reference,
        "robots_checked_at": source.robots_checked_at.isoformat() if source.robots_checked_at else None,
        "terms_checked_at": source.terms_checked_at.isoformat() if source.terms_checked_at else None,
        "can_run_automatically": can_run,
        "compliance_block_reason": block_reason,
        "enabled": source.enabled
    }
    return success_response(data=data, request_id=request_id)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_source(
    payload: SourceCreatePayload,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Registers a new government source in disabled/pending_review state."""
    request_id = getattr(request.state, "request_id", "direct")
    existing = await db.execute(select(Source).where(Source.source_id == payload.source_id))
    if existing.scalar_one_or_none():
        raise AppException(
            code="SOURCE_ALREADY_EXISTS",
            message=f"Source with ID '{payload.source_id}' already exists",
            status_code=409
        )

    # All new sources start disabled and pending review per compliance policy
    source = Source(
        source_id=payload.source_id,
        name=payload.name,
        base_url=payload.base_url,
        source_family=payload.source_family,
        jurisdiction=payload.jurisdiction,
        adapter_key=payload.adapter_key,
        fetch_mode=payload.fetch_mode,
        allowed_content_types=payload.allowed_content_types,
        schedule_cron=payload.schedule_cron,
        notes=payload.notes,
        permission_status="pending_review",
        automation_status="disabled",
        enabled=False
    )
    db.add(source)

    audit = AuditEvent(
        id=f"aud-{uuid.uuid4().hex[:12]}",
        actor="admin",
        action="source_registered",
        resource_type="source",
        resource_id=payload.source_id,
        details_json={"name": payload.name, "base_url": payload.base_url}
    )
    db.add(audit)
    await db.commit()

    return success_response(data={"source_id": source.source_id, "status": "created_pending_review"}, request_id=request_id)


@router.post("/{source_id}/review")
async def review_source_policy(
    source_id: str,
    payload: PolicyReviewPayload,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Records human policy review, robots.txt check, and terms inspection decision."""
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(select(Source).where(Source.source_id == source_id))
    source = res.scalar_one_or_none()

    if not source:
        raise AppException(code="SOURCE_NOT_FOUND", message=f"Source '{source_id}' not found", status_code=404)

    # 1. Inspect robots.txt if requested
    if payload.verify_robots_txt:
        robots_ok, robots_msg = await check_source_robots_txt(source)
        source.robots_checked_at = utc_now()
        if not robots_ok and payload.decision == "approved":
            raise AppException(
                code="ROBOTS_TXT_DISALLOWED",
                message=f"Cannot approve source: robots.txt disallows crawler ({robots_msg})",
                status_code=400
            )
    elif payload.decision == "approved" and not source.robots_checked_at:
        # Human compliance review recorded inspection
        source.robots_checked_at = utc_now()

    # 2. Apply Decision
    source.permission_status = payload.decision
    source.terms_checked_at = utc_now()
    if payload.terms_url:
        source.terms_url = payload.terms_url
    if payload.written_authorization_reference:
        source.written_authorization_reference = payload.written_authorization_reference
    if payload.notes:
        source.notes = f"{source.notes or ''} [Review Note: {payload.notes}]".strip()

    # If decision is not approved, ensure automation is strictly disabled
    if payload.decision != "approved":
        source.automation_status = "disabled"
        source.enabled = False

    audit = AuditEvent(
        id=f"aud-{uuid.uuid4().hex[:12]}",
        actor=payload.reviewer,
        action="source_policy_review",
        resource_type="source",
        resource_id=source_id,
        details_json={
            "decision": payload.decision,
            "written_authorization": payload.written_authorization_reference,
            "terms_url": payload.terms_url
        }
    )
    db.add(audit)
    await db.commit()

    # Synchronize scheduler jobs
    await scheduler_manager.reconcile_source_schedules()

    return success_response(
        data={
            "source_id": source_id,
            "permission_status": source.permission_status,
            "automation_status": source.automation_status,
            "enabled": source.enabled
        },
        request_id=request_id
    )


@router.post("/{source_id}/enable")
async def enable_source(
    source_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Enables automation for a source.

    Gated by compliance check: raises 403 if permission is pending, prohibited, or written authorization missing.
    """
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(select(Source).where(Source.source_id == source_id))
    source = res.scalar_one_or_none()

    if not source:
        raise AppException(code="SOURCE_NOT_FOUND", message=f"Source '{source_id}' not found", status_code=404)

    # Compliance Gate Check before enabling
    if source.permission_status != "approved":
        raise AppException(
            code="COMPLIANCE_GATE_BLOCKED",
            message=f"Cannot enable source: Permission status is '{source.permission_status}' (must be approved first).",
            status_code=403
        )

    if (source.source_id == "SRC-MYSCHEME-DIR" or "myscheme" in source.base_url.lower()) and not source.written_authorization_reference:
        raise AppException(
            code="MYSCHEME_RESTRICTION",
            message="myScheme automation cannot be enabled without verified written authorization reference (Blueprint Section 3.3).",
            status_code=403
        )

    source.automation_status = "enabled"
    source.enabled = True
    await db.commit()

    # Schedule source job in APScheduler
    await scheduler_manager.reconcile_source_schedules()

    return success_response(
        data={"source_id": source_id, "automation_status": "enabled", "enabled": True},
        request_id=request_id
    )


@router.post("/{source_id}/disable")
async def disable_source(
    source_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Pauses automation for a source."""
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(select(Source).where(Source.source_id == source_id))
    source = res.scalar_one_or_none()

    if not source:
        raise AppException(code="SOURCE_NOT_FOUND", message=f"Source '{source_id}' not found", status_code=404)

    source.automation_status = "disabled"
    source.enabled = False
    await db.commit()

    # Reconcile scheduler to remove job
    await scheduler_manager.reconcile_source_schedules()

    return success_response(
        data={"source_id": source_id, "automation_status": "disabled", "enabled": False},
        request_id=request_id
    )
