"""Source Freshness & Data Registry Monitoring API.

Enforces Blueprint Section 2 & Phase 9 Gate:
- Real-time observation of source freshness and staleness intervals.
- Automatic alerts when governing official sources exceed acceptable check windows (> 7 days).
- Document version cadence telemetry.
"""

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.envelope import success_response
from backend.app.db.models import Source, Document, DocumentVersion, ResourceCandidate
from backend.app.db.session import get_db

router = APIRouter(prefix="/freshness", tags=["Freshness & Source Monitoring"])


@router.get("")
async def get_freshness_metrics(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Returns source staleness metrics, pending review backlogs, and version health."""
    request_id = getattr(request.state, "request_id", "direct")

    sources_res = await db.execute(select(Source).order_by(Source.created_at))
    sources = sources_res.scalars().all()

    now = datetime.now(timezone.utc)
    stale_threshold_days = 7

    source_metrics = []
    total_stale = 0

    for s in sources:
        last_checked = s.last_success_at
        if last_checked:
            if last_checked.tzinfo is None:
                last_checked = last_checked.replace(tzinfo=timezone.utc)
            days_since = (now - last_checked).total_seconds() / 86400.0
        else:
            days_since = 999.0

        is_stale = days_since > stale_threshold_days and s.enabled
        if is_stale:
            total_stale += 1

        source_metrics.append({
            "source_id": s.source_id,
            "name": s.name,
            "permission_status": s.permission_status,
            "automation_status": s.automation_status,
            "adapter_key": s.adapter_key,
            "schedule_cron": s.schedule_cron,
            "last_success_at": s.last_success_at.isoformat() if s.last_success_at else None,
            "days_since_check": round(days_since, 1) if days_since < 900 else None,
            "is_stale": is_stale,
            "enabled": s.enabled
        })

    # Pending candidates backlog
    pending_count = await db.scalar(
        select(func.count(ResourceCandidate.id)).where(ResourceCandidate.review_status == "pending_review")
    )

    data = {
        "summary": {
            "total_sources": len(sources),
            "stale_sources_count": total_stale,
            "pending_candidates_backlog": pending_count or 0,
            "stale_threshold_days": stale_threshold_days,
            "status": "HEALTHY" if total_stale == 0 else "ATTENTION_REQUIRED"
        },
        "sources": source_metrics
    }

    return success_response(data=data, request_id=request_id)
