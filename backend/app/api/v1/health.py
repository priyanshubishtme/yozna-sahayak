"""Health check and readiness endpoints."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.config import settings
from backend.app.core.envelope import success_response
from backend.app.db.session import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
async def get_health_status(request: Request, db: AsyncSession = Depends(get_db)):
    """Health check verifying API readiness, DB connectivity, and storage paths."""
    request_id = getattr(request.state, "request_id", "direct")
    db_ok = False
    db_error = None

    try:
        res = await db.execute(text("SELECT 1"))
        if res.scalar() == 1:
            db_ok = True
    except Exception as e:
        db_error = str(e)

    data_dir_ok = settings.data_dir.exists()
    status = "ok" if (db_ok and data_dir_ok) else "degraded"

    payload = {
        "status": status,
        "app_name": settings.app_name,
        "version": settings.version,
        "environment": settings.app_env,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database_connected": db_ok,
        "components": {
            "database": {
                "status": "healthy" if db_ok else "degraded",
                "message": "Connected" if db_ok else f"DB connection failed: {db_error}"
            },
            "storage": {
                "status": "healthy" if data_dir_ok else "degraded",
                "message": f"Data directory verified at {settings.data_dir}"
            },
            "scheduler": {
                "status": "healthy",
                "message": f"Mode: {settings.scheduler_process_mode}"
            }
        }
    }

    return success_response(data=payload, request_id=request_id)
