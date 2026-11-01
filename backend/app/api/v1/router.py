"""Aggregates all API v1 routers into a single master router."""

from fastapi import APIRouter
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.schemes import router as schemes_router
from backend.app.api.v1.sources import router as sources_router
from backend.app.api.v1.discovery import router as discovery_router
from backend.app.api.v1.review import router as review_router
from backend.app.api.v1.documents import router as documents_router, public_evidence_router
from backend.app.api.v1.rules import router as rules_router
from backend.app.api.v1.chat import router as chat_router
from backend.app.api.v1.assistant import router as assistant_router
from backend.app.api.v1.eligibility import router as eligibility_router, get_questionnaire_schema
from backend.app.api.v1.reminders import router as reminders_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.freshness import router as freshness_router
from backend.app.api.v1.audit_export import router as audit_export_router
from backend.app.api.v1.admin_auth import router as admin_auth_router
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.citizen_portal import router as citizen_portal_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(admin_auth_router)
api_v1_router.include_router(citizen_portal_router)
api_v1_router.include_router(schemes_router)
api_v1_router.include_router(sources_router)
api_v1_router.include_router(discovery_router)
api_v1_router.include_router(review_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(public_evidence_router)
api_v1_router.include_router(rules_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(assistant_router)
api_v1_router.include_router(eligibility_router)
api_v1_router.include_router(reminders_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(analytics_router, prefix="/admin")
api_v1_router.include_router(freshness_router)
api_v1_router.include_router(freshness_router, prefix="/admin")
api_v1_router.include_router(audit_export_router)
api_v1_router.include_router(audit_export_router, prefix="/admin")
api_v1_router.add_api_route("/questionnaire", get_questionnaire_schema, methods=["GET"])
