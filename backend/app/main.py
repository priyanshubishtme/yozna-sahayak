"""FastAPI Application Entry Point for Yojana Sahayak.

Configures middlewares, CORS, error handling, life cycle hooks, and routers.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.v1.health import router as root_health_router
from backend.app.api.v1.centre_locator import router as centre_locator_router
from backend.app.api.v1.router import api_v1_router
from backend.app.config import settings
from backend.app.core.errors import register_error_handlers
from backend.app.core.logging import logger
from backend.app.core.middleware import RequestContextMiddleware
from backend.app.core.rate_limit import RateLimitMiddleware
from backend.app.db.seed import seed_database
from backend.app.db.session import AsyncSessionLocal
from backend.app.scheduler.manager import scheduler_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handling database readiness, seed validation, and APScheduler lifecycle."""
    logger.info(f"Starting {settings.app_name} in {settings.app_env} environment...")
    try:
        async with AsyncSessionLocal() as session:
            await seed_database(session)
    except Exception as e:
        logger.warning(f"Database seed check warning: {e}")

    # Start single-instance scheduler if enabled
    if settings.scheduler_process_mode:
        started = scheduler_manager.start()
        if started:
            try:
                await scheduler_manager.reconcile_source_schedules()
            except Exception as e:
                logger.warning(f"Initial schedule reconciliation warning: {e}")

    yield

    logger.info(f"Shutting down {settings.app_name}...")
    scheduler_manager.shutdown()


def create_app() -> FastAPI:
    """Factory creating and configuring the FastAPI instance."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="Bilingual, evidence-grounded government scheme discovery and deterministic eligibility assistant.",
        lifespan=lifespan
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Process-Time-Ms"]
    )

    # Custom request context tracking middleware
    app.add_middleware(RequestContextMiddleware)

    # In-flight token bucket rate limiting (Phase 10 Security)
    app.add_middleware(RateLimitMiddleware, default_limit=120, strict_limit=60)

    # Global error handlers
    register_error_handlers(app)

    # Health router mounted at root level as well as /api/v1
    app.include_router(root_health_router)

    # Mount versioned API routes
    app.include_router(api_v1_router, prefix=settings.api_v1_prefix)

    # Mount Centre Locator proxy routes (/api/geocode, /api/centres)
    app.include_router(centre_locator_router)

    # Optional static file serving for turnkey production deployment
    frontend_dist = Path(__file__).resolve().parents[2] / "apps" / "web" / "dist"
    if frontend_dist.exists():
        app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=(settings.app_env == "development")
    )
