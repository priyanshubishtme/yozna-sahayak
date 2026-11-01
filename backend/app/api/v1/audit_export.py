"""Audit Trail & Administrative Export API.

Enforces Blueprint Section 14.1 & Phase 9 Gate:
- Exportable audit logs for statutory compliance and transparency.
- CSV and JSON export formats for administrative governance.
- Records all policy approvals, candidate reviews, and rule invalidations.
"""

import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.envelope import success_response
from backend.app.db.models import AuditEvent
from backend.app.db.session import get_db

router = APIRouter(prefix="/audit", tags=["Audit & Governance"])


@router.get("/export")
async def export_audit_log(
    request: Request,
    format: str = Query("json", pattern="^(json|csv)$"),
    limit: int = Query(200, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """Exports immutable audit events in structured JSON or CSV format."""
    request_id = getattr(request.state, "request_id", "direct")

    res = await db.execute(
        select(AuditEvent)
        .order_by(AuditEvent.created_at.desc())
        .limit(limit)
    )
    events = res.scalars().all()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "created_at", "actor", "action", "resource_type", "resource_id", "details"])

        for ev in events:
            writer.writerow([
                ev.id,
                ev.created_at.isoformat() if ev.created_at else "",
                ev.actor,
                ev.action,
                ev.resource_type,
                ev.resource_id,
                str(ev.details_json or "")
            ])

        return PlainTextResponse(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="yojana_sahayak_audit_log.csv"'}
        )

    # JSON export
    items = [
        {
            "id": ev.id,
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
            "actor": ev.actor,
            "action": ev.action,
            "resource_type": ev.resource_type,
            "resource_id": ev.resource_id,
            "details": ev.details_json or {}
        }
        for ev in events
    ]

    return success_response(data={"total": len(items), "events": items}, request_id=request_id)

