"""Deterministic Eligibility Evaluation & Recommendation APIs.

Enforces Blueprint Section 10 & Phase 7 Gate:
- Zero LLM inference in verdict determination (100% deterministic Python evaluator).
- Three-valued evaluation: TRUE, FALSE, UNKNOWN.
- Multi-factor ranking: Tier > Confidence > Completeness > Verification > Recency.
- Explainability breakdown with verified quotes and page citations.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.envelope import success_response
from backend.app.db.session import get_db
from backend.app.eligibility.questions import get_all_questions, get_categories
from backend.app.eligibility.service import eligibility_service

router = APIRouter(prefix="/eligibility", tags=["Deterministic Eligibility & Ranking"])


class EvaluateProfileRequest(BaseModel):
    profile: Dict[str, Any] = Field(..., description="Citizen demographic, agricultural, and economic attributes")
    scheme_id: Optional[str] = Field(None, description="Optional single scheme filter")


@router.post("/evaluate")
async def evaluate_eligibility(
    payload: EvaluateProfileRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Evaluates a citizen profile across schemes and returns ranked recommendations."""
    request_id = getattr(request.state, "request_id", "direct")
    ranked_schemes = await eligibility_service.evaluate_profile(
        db=db,
        profile=payload.profile,
        scheme_id=payload.scheme_id
    )

    # Compute summary telemetry
    counts = {
        "Eligible": 0,
        "Likely Eligible": 0,
        "Need More Information": 0,
        "Not Eligible": 0
    }
    for item in ranked_schemes:
        tier = item.tier
        if tier in counts:
            counts[tier] += 1

    return success_response(
        data={
            "total_schemes_evaluated": len(ranked_schemes),
            "counts": counts,
            "ranked_schemes": [item.to_dict() for item in ranked_schemes]
        },
        request_id=request_id
    )


@router.get("/questions")
@router.get("/questionnaire")
async def get_questionnaire_schema(request: Request):
    """Returns bilingual questionnaire schema mapping citizen profile fields."""
    request_id = getattr(request.state, "request_id", "direct")
    questions = get_all_questions()
    categories = get_categories()
    return success_response(
        data={
            "total_questions": len(questions),
            "categories": categories,
            "questions": questions
        },
        request_id=request_id
    )

