"""Admin Eligibility Rules and Invalidation Review Console API.

Enforces Blueprint Section 8.1 - 8.4 & Phase 5 Gate:
- Every active rule maintains verified source quote and page number.
- Changing/superseding source document immediately marks dependent rules as 'needs_review'.
- Human policy approval is mandatory to transition rules to 'active'.
"""

from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.envelope import success_response
from backend.app.core.errors import AppException
from backend.app.db.base import utc_now
from backend.app.db.models import (
    AuditEvent,
    Document,
    DocumentVersion,
    EligibilityRule,
    RuleDocumentDependency,
    RuleReview,
    Scheme
)
from backend.app.db.session import get_db
from backend.app.rules.schema import (
    RuleCreateRequest,
    RuleReviewDecision,
    RuleUpdateRequest
)
from backend.app.rules.service import rule_service

router = APIRouter(prefix="/admin/rules", tags=["Admin Eligibility Rules"])


@router.get("")
async def list_rules(
    request: Request,
    scheme_id: Optional[str] = Query(None, description="Filter by scheme ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (active, needs_review, draft, retired)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Lists eligibility rules with scheme provenance, dependency version, and status."""
    request_id = getattr(request.state, "request_id", "direct")
    query = (
        select(EligibilityRule, Scheme.name_en, Scheme.name_hi, Scheme.code)
        .join(Scheme, EligibilityRule.scheme_id == Scheme.scheme_id)
        .order_by(desc(EligibilityRule.updated_at))
    )

    if scheme_id:
        query = query.where(EligibilityRule.scheme_id == scheme_id)
    if status_filter:
        query = query.where(EligibilityRule.status == status_filter)

    total_query = select(func.count(EligibilityRule.id))
    if scheme_id:
        total_query = total_query.where(EligibilityRule.scheme_id == scheme_id)
    if status_filter:
        total_query = total_query.where(EligibilityRule.status == status_filter)
    total_count = (await db.execute(total_query)).scalar_one()

    res = await db.execute(query.limit(limit).offset(offset))
    rows = res.all()

    items = []
    for rule, s_name_en, s_name_hi, s_code in rows:
        # Fetch primary dependency
        dep_res = await db.execute(
            select(RuleDocumentDependency, DocumentVersion.status, DocumentVersion.storage_key)
            .join(DocumentVersion, RuleDocumentDependency.document_version_id == DocumentVersion.id)
            .where(RuleDocumentDependency.rule_id == rule.id)
        )
        dep_row = dep_res.first()

        dep_info = None
        if dep_row:
            dep, v_status, v_path = dep_row
            dep_info = {
                "document_version_id": dep.document_version_id,
                "version_status": v_status,
                "page_number": dep.page_number
            }

        # Count reviews
        rev_count_res = await db.execute(
            select(func.count(RuleReview.id)).where(RuleReview.rule_id == rule.id)
        )
        rev_count = rev_count_res.scalar_one()

        items.append({
            "id": rule.id,
            "scheme_id": rule.scheme_id,
            "scheme_code": s_code,
            "scheme_name_en": s_name_en,
            "scheme_name_hi": s_name_hi,
            "rule_code": rule.rule_code,
            "version": rule.version,
            "status": rule.status,
            "logic_expression": rule.logic_expression,
            "evidence_quote": rule.evidence_quote,
            "page_reference": rule.page_reference,
            "dependency": dep_info,
            "reviews_count": rev_count,
            "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
            "created_at": rule.created_at.isoformat() if rule.created_at else None
        })

    pagination = {"total": total_count, "limit": limit, "offset": offset, "count": len(items)}
    return success_response(data=items, request_id=request_id, pagination=pagination)


@router.get("/summary")
async def get_rules_summary(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Returns telemetry counts of rules by status and scheme coverage."""
    request_id = getattr(request.state, "request_id", "direct")
    
    total = (await db.execute(select(func.count(EligibilityRule.id)))).scalar_one()
    active = (await db.execute(select(func.count(EligibilityRule.id)).where(EligibilityRule.status == "active"))).scalar_one()
    needs_review = (await db.execute(select(func.count(EligibilityRule.id)).where(EligibilityRule.status == "needs_review"))).scalar_one()
    draft = (await db.execute(select(func.count(EligibilityRule.id)).where(EligibilityRule.status == "draft"))).scalar_one()
    retired = (await db.execute(select(func.count(EligibilityRule.id)).where(EligibilityRule.status == "retired"))).scalar_one()

    # Schemes with rules enabled
    schemes_res = await db.execute(
        select(Scheme.scheme_id, Scheme.name_en, Scheme.rules_enabled, Scheme.rag_enabled, Scheme.initial_mode)
        .order_by(Scheme.name_en)
    )
    schemes = [
        {
            "scheme_id": s.scheme_id,
            "name_en": s.name_en,
            "rules_enabled": s.rules_enabled,
            "rag_enabled": s.rag_enabled,
            "initial_mode": s.initial_mode
        }
        for s in schemes_res.all()
    ]

    return success_response(
        data={
            "total_rules": total,
            "active_rules": active,
            "needs_review_rules": needs_review,
            "draft_rules": draft,
            "retired_rules": retired,
            "schemes_count": len(schemes),
            "schemes": schemes
        },
        request_id=request_id
    )


@router.get("/{rule_id}")
async def get_rule_detail(
    rule_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Returns full rule condition tree, evidence quotes, dependencies, and review audit trail."""
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(
        select(EligibilityRule, Scheme.name_en, Scheme.name_hi, Scheme.code)
        .join(Scheme, EligibilityRule.scheme_id == Scheme.scheme_id)
        .where(EligibilityRule.id == rule_id)
    )
    row = res.first()
    if not row:
        raise AppException(code="RULE_NOT_FOUND", message=f"Rule '{rule_id}' not found", status_code=404)

    rule, s_name_en, s_name_hi, s_code = row

    # Fetch dependencies with Document Version info
    deps_res = await db.execute(
        select(RuleDocumentDependency, DocumentVersion, Document.title)
        .join(DocumentVersion, RuleDocumentDependency.document_version_id == DocumentVersion.id)
        .join(Document, DocumentVersion.document_id == Document.id)
        .where(RuleDocumentDependency.rule_id == rule.id)
    )
    deps_list = []
    for dep, ver, d_title in deps_res.all():
        deps_list.append({
            "id": dep.id,
            "document_title": d_title,
            "document_version_id": ver.id,
            "version_number": ver.version_number,
            "status": ver.status,
            "storage_key": ver.storage_key,
            "page_number": dep.page_number
        })

    # Fetch review history
    revs_res = await db.execute(
        select(RuleReview).where(RuleReview.rule_id == rule.id).order_by(desc(RuleReview.reviewed_at))
    )
    reviews = [
        {
            "id": r.id,
            "reviewer": r.reviewer,
            "decision": r.decision,
            "notes": r.notes,
            "reviewed_at": r.reviewed_at.isoformat()
        }
        for r in revs_res.scalars().all()
    ]

    return success_response(
        data={
            "id": rule.id,
            "scheme_id": rule.scheme_id,
            "scheme_code": s_code,
            "scheme_name_en": s_name_en,
            "scheme_name_hi": s_name_hi,
            "rule_code": rule.rule_code,
            "version": rule.version,
            "status": rule.status,
            "rule_json": rule.rule_json,
            "logic_expression": rule.logic_expression,
            "evidence_quote": rule.evidence_quote,
            "page_reference": rule.page_reference,
            "dependencies": deps_list,
            "reviews": reviews,
            "updated_at": rule.updated_at.isoformat() if rule.updated_at else None,
            "created_at": rule.created_at.isoformat() if rule.created_at else None
        },
        request_id=request_id
    )


@router.post("")
async def create_rule(
    payload: RuleCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Creates a new rule with verified document dependencies and initial pending_review status."""
    request_id = getattr(request.state, "request_id", "direct")
    rule = await rule_service.create_rule(db=db, payload=payload, actor="admin_user")
    return success_response(
        data={
            "id": rule.id,
            "rule_code": rule.rule_code,
            "status": rule.status,
            "logic_expression": rule.logic_expression
        },
        request_id=request_id,
        status_code=status.HTTP_201_CREATED
    )


@router.put("/{rule_id}")
async def update_rule(
    rule_id: str,
    payload: RuleUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Updates an existing rule. Increments version and marks status as 'needs_review'."""
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(select(EligibilityRule).where(EligibilityRule.id == rule_id))
    rule = res.scalar_one_or_none()
    if not rule:
        raise AppException(code="RULE_NOT_FOUND", message=f"Rule '{rule_id}' not found", status_code=404)

    if payload.rule_json:
        rule_dict = payload.rule_json.model_dump()
        rule.rule_json = rule_dict
        rule.logic_expression = payload.logic_expression or rule_service.generate_logic_expression(rule_dict)
    if payload.evidence_quote:
        rule.evidence_quote = payload.evidence_quote
    if payload.page_reference:
        rule.page_reference = payload.page_reference

    # Any modification increments version and marks status as needs_review per Blueprint Section 8.4
    rule.version += 1
    rule.status = "needs_review"
    rule.updated_at = utc_now()

    # Update dependency if document_version_id specified
    if payload.document_version_id:
        v_res = await db.execute(select(DocumentVersion).where(DocumentVersion.id == payload.document_version_id))
        if not v_res.scalar_one_or_none():
            raise AppException(code="VERSION_NOT_FOUND", message=f"Document version '{payload.document_version_id}' not found", status_code=404)

        dep_res = await db.execute(select(RuleDocumentDependency).where(RuleDocumentDependency.rule_id == rule.id))
        dep = dep_res.scalars().first()
        if dep:
            dep.document_version_id = payload.document_version_id
            dep.page_number = rule.page_reference
        else:
            db.add(RuleDocumentDependency(
                rule_id=rule.id,
                document_version_id=payload.document_version_id,
                page_number=rule.page_reference
            ))

    await db.commit()
    await db.refresh(rule)

    return success_response(
        data={
            "id": rule.id,
            "version": rule.version,
            "status": rule.status,
            "logic_expression": rule.logic_expression
        },
        request_id=request_id
    )


@router.post("/{rule_id}/review")
async def review_rule(
    rule_id: str,
    payload: RuleReviewDecision,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Admin review decision: approve (activates rule), request_changes, or retire."""
    request_id = getattr(request.state, "request_id", "direct")
    rule = await rule_service.review_rule(db=db, rule_id=rule_id, review_data=payload)
    return success_response(
        data={
            "id": rule.id,
            "rule_code": rule.rule_code,
            "status": rule.status,
            "decision": payload.decision
        },
        request_id=request_id
    )


@router.post("/simulate-source-change")
async def simulate_source_change(
    request: Request,
    document_version_id: str = Query(..., description="Target document version ID that changed"),
    reason: str = Query("annual_guideline_revision", description="Reason for document change"),
    db: AsyncSession = Depends(get_db)
):
    """Diagnostic endpoint to simulate a source document change and verify rule invalidation."""
    request_id = getattr(request.state, "request_id", "direct")
    invalidated_ids = await rule_service.invalidate_dependent_rules(
        db=db,
        document_version_id=document_version_id,
        reason=reason
    )
    return success_response(
        data={
            "document_version_id": document_version_id,
            "invalidated_rules_count": len(invalidated_ids),
            "invalidated_rule_ids": invalidated_ids
        },
        request_id=request_id
    )
