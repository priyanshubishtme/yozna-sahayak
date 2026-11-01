"""Public scheme catalogue and detail endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.envelope import error_response, success_response
from backend.app.core.errors import AppException
from backend.app.db.models import Scheme, Document, DocumentVersion, SchemeDocument, EligibilityRule, RuleDocumentDependency
from backend.app.db.session import get_db
from backend.app.schemes_metadata import SCHEMES_EXTRA_METADATA

router = APIRouter(prefix="/schemes", tags=["Schemes"])


@router.get("")
async def list_schemes(
    request: Request,
    q: Optional[str] = Query(None, description="Search term for name, category, or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    level: Optional[str] = Query(None, description="Filter by jurisdiction level (central/state)"),
    state: Optional[str] = Query(None, description="Filter by state (e.g. Uttarakhand)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Lists schemes with rich search, category, and jurisdiction filters."""
    request_id = getattr(request.state, "request_id", "direct")
    query = select(Scheme)

    if category and category.lower() != "all":
        query = query.where(Scheme.category == category)
    if level and level.lower() != "all":
        query = query.where(Scheme.level == level)

    if q:
        search_filter = f"%{q}%"
        query = query.where(
            or_(
                Scheme.name_en.ilike(search_filter),
                Scheme.name_hi.ilike(search_filter),
                Scheme.description_en.ilike(search_filter),
                Scheme.description_hi.ilike(search_filter),
                Scheme.short_name.ilike(search_filter),
                Scheme.ministry_or_dept.ilike(search_filter),
                Scheme.category.ilike(search_filter),
                Scheme.code.ilike(search_filter)
            )
        )

    # Order by category and name
    query = query.order_by(Scheme.category, Scheme.name_en).limit(limit).offset(offset)
    result = await db.execute(query)
    schemes = result.scalars().all()

    items = []
    for s in schemes:
        meta = SCHEMES_EXTRA_METADATA.get(s.scheme_id, {})
        scheme_state = "Uttarakhand" if s.level == "state" or "uk_" in s.code else None

        # Filter by state if specified
        if state and state.lower() != "all":
            if state.lower() == "central" and s.level != "central":
                continue
            elif state.lower() != "central" and scheme_state != state:
                continue

        # Count verified documents linked
        doc_count_res = await db.execute(
            select(SchemeDocument).where(SchemeDocument.scheme_id == s.scheme_id)
        )
        doc_count = len(doc_count_res.scalars().all())

        item = {
            "scheme_id": s.scheme_id,
            "code": s.code,
            "name_en": s.name_en,
            "name_hi": s.name_hi,
            "short_name": s.short_name,
            "level": s.level,
            "state": scheme_state,
            "ministry_or_dept": s.ministry_or_dept,
            "category": s.category,
            "description_en": s.description_en,
            "description_hi": s.description_hi,
            "initial_mode": s.initial_mode,
            "rule_scope": s.rule_scope,
            "rag_enabled": s.rag_enabled,
            "rules_enabled": s.rules_enabled,
            "official_portal_url": s.official_portal_url,
            "benefits_summary_en": s.benefits_summary_en,
            "benefits_summary_hi": s.benefits_summary_hi,
            "beneficiaries": meta.get("beneficiaries"),
            "eligibility_criteria": meta.get("eligibility_criteria"),
            "age_criteria": meta.get("age_criteria"),
            "income_criteria": meta.get("income_criteria"),
            "required_documents": meta.get("required_documents", []),
            "application_process": meta.get("application_process"),
            "application_mode": meta.get("application_mode", "Online / Offline"),
            "exclusions": meta.get("exclusions"),
            "relevant_pages": meta.get("relevant_pages", [1]),
            "guideline_title": meta.get("guideline_title"),
            "pdf_filename": meta.get("pdf_filename"),
            "document_count": doc_count
        }
        items.append(item)

    pagination = {
        "limit": limit,
        "offset": offset,
        "count": len(items)
    }

    return success_response(data=items, request_id=request_id, pagination=pagination)


@router.get("/compare/batch")
async def compare_schemes_batch(
    request: Request,
    ids: str = Query(..., description="Comma-separated list of 2 or 3 scheme IDs to compare"),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves comprehensive structured details and deterministic comparative insights for 2 or 3 schemes."""
    request_id = getattr(request.state, "request_id", "direct")
    scheme_ids = [i.strip() for i in ids.split(",") if i.strip()]

    if len(scheme_ids) < 2 or len(scheme_ids) > 3:
        raise AppException(
            code="INVALID_COMPARISON_COUNT",
            message="Scheme comparison requires between 2 and 3 schemes",
            status_code=400
        )

    results = []
    for sid in scheme_ids:
        res = await db.execute(
            select(Scheme).where(or_(Scheme.scheme_id == sid, Scheme.code == sid))
        )
        s = res.scalar_one_or_none()
        if not s:
            continue

        meta = SCHEMES_EXTRA_METADATA.get(s.scheme_id, {})
        scheme_state = "Uttarakhand" if s.level == "state" or "uk_" in s.code else None

        # Fetch verified documents
        doc_query = (
            select(Document, DocumentVersion, SchemeDocument)
            .join(SchemeDocument, Document.id == SchemeDocument.document_id)
            .join(DocumentVersion, Document.id == DocumentVersion.document_id)
            .where(
                SchemeDocument.scheme_id == s.scheme_id,
                Document.status == "verified",
                DocumentVersion.status == "verified"
            )
        )
        doc_res = await db.execute(doc_query)
        verified_docs = [
            {
                "document_id": doc.id,
                "title": doc.title,
                "document_type": doc.document_type,
                "version_id": ver.id,
                "total_pages": ver.page_count,
                "relevant_pages": meta.get("relevant_pages", [1]),
                "pdf_url": f"/api/v1/evidence/{ver.id}/pdf",
                "is_primary": sd.is_primary
            }
            for doc, ver, sd in doc_res.all()
        ]

        # Fetch active rules
        rules_res = await db.execute(
            select(EligibilityRule).where(
                EligibilityRule.scheme_id == s.scheme_id,
                EligibilityRule.status == "active"
            )
        )
        active_rules = [
            {
                "id": r.id,
                "rule_code": r.rule_code,
                "evidence_quote": r.evidence_quote,
                "page_reference": r.page_reference
            }
            for r in rules_res.scalars().all()
        ]

        results.append({
            "scheme_id": s.scheme_id,
            "code": s.code,
            "name_en": s.name_en,
            "name_hi": s.name_hi,
            "short_name": s.short_name,
            "level": s.level,
            "state": scheme_state,
            "ministry_or_dept": s.ministry_or_dept,
            "category": s.category,
            "description_en": s.description_en,
            "description_hi": s.description_hi,
            "initial_mode": s.initial_mode,
            "official_portal_url": s.official_portal_url,
            "benefits_summary_en": s.benefits_summary_en,
            "benefits_summary_hi": s.benefits_summary_hi,
            "objectives": meta.get("objectives"),
            "beneficiaries": meta.get("beneficiaries"),
            "eligibility_criteria": meta.get("eligibility_criteria"),
            "age_criteria": meta.get("age_criteria"),
            "income_criteria": meta.get("income_criteria"),
            "required_documents": meta.get("required_documents", []),
            "application_process": meta.get("application_process"),
            "application_mode": meta.get("application_mode", "Online / Offline"),
            "exclusions": meta.get("exclusions"),
            "relevant_pages": meta.get("relevant_pages", [1]),
            "guideline_title": meta.get("guideline_title"),
            "pdf_filename": meta.get("pdf_filename"),
            "verified_documents": verified_docs,
            "active_rules": active_rules
        })

    if len(results) < 2:
        raise AppException(
            code="INSUFFICIENT_SCHEMES_FOUND",
            message="At least 2 valid schemes must be located in database for comparison",
            status_code=404
        )

    # Derive deterministic comparative insights
    all_docs_sets = [set(r.get("required_documents", [])) for r in results]
    common_docs = list(set.intersection(*all_docs_sets)) if all_docs_sets else []

    comparison_data = {
        "compared_schemes": results,
        "insights": {
            "total_compared": len(results),
            "common_documents": common_docs,
            "categories": [r["category"] for r in results],
            "jurisdictions": [r["level"] for r in results]
        }
    }

    return success_response(data=comparison_data, request_id=request_id)


@router.get("/{scheme_id}")
async def get_scheme_detail(
    scheme_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Retrieves full scheme detail by scheme_id including source documents and rules."""
    request_id = getattr(request.state, "request_id", "direct")
    result = await db.execute(select(Scheme).where(Scheme.scheme_id == scheme_id))
    scheme = result.scalar_one_or_none()

    if not scheme:
        # Fallback to search by code if scheme_id didn't match directly
        code_res = await db.execute(select(Scheme).where(Scheme.code == scheme_id))
        scheme = code_res.scalar_one_or_none()

    if not scheme:
        raise AppException(
            code="SCHEME_NOT_FOUND",
            message=f"Scheme with ID '{scheme_id}' was not found",
            status_code=404
        )

    meta = SCHEMES_EXTRA_METADATA.get(scheme.scheme_id, {})
    scheme_state = "Uttarakhand" if scheme.level == "state" or "uk_" in scheme.code else None

    data = {
        "scheme_id": scheme.scheme_id,
        "code": scheme.code,
        "name_en": scheme.name_en,
        "name_hi": scheme.name_hi,
        "short_name": scheme.short_name,
        "level": scheme.level,
        "state": scheme_state,
        "ministry_or_dept": scheme.ministry_or_dept,
        "category": scheme.category,
        "description_en": scheme.description_en,
        "description_hi": scheme.description_hi,
        "initial_mode": scheme.initial_mode,
        "rule_scope": scheme.rule_scope,
        "rag_enabled": scheme.rag_enabled,
        "rules_enabled": scheme.rules_enabled,
        "official_portal_url": scheme.official_portal_url,
        "benefits_summary_en": scheme.benefits_summary_en,
        "benefits_summary_hi": scheme.benefits_summary_hi,
        "objectives": meta.get("objectives"),
        "beneficiaries": meta.get("beneficiaries"),
        "eligibility_criteria": meta.get("eligibility_criteria"),
        "age_criteria": meta.get("age_criteria"),
        "income_criteria": meta.get("income_criteria"),
        "required_documents": meta.get("required_documents", []),
        "application_process": meta.get("application_process"),
        "application_mode": meta.get("application_mode", "Online / Offline"),
        "exclusions": meta.get("exclusions"),
        "relevant_pages": meta.get("relevant_pages", [1]),
        "guideline_title": meta.get("guideline_title"),
        "pdf_filename": meta.get("pdf_filename")
    }

    # Load verified documents linked to this scheme
    doc_query = (
        select(Document, DocumentVersion, SchemeDocument)
        .join(SchemeDocument, Document.id == SchemeDocument.document_id)
        .join(DocumentVersion, Document.id == DocumentVersion.document_id)
        .where(
            SchemeDocument.scheme_id == scheme.scheme_id,
            Document.status == "verified",
            DocumentVersion.status == "verified"
        )
    )
    doc_res = await db.execute(doc_query)
    verified_docs = []
    for doc, ver, sd in doc_res.all():
        verified_docs.append({
            "document_id": doc.id,
            "title": doc.title,
            "document_type": doc.document_type,
            "issuer": doc.issuer,
            "jurisdiction": doc.jurisdiction,
            "version_id": ver.id,
            "version_number": ver.version_number,
            "storage_key": ver.storage_key,
            "content_type": ver.content_type,
            "binary_sha256": ver.binary_sha256,
            "total_pages": ver.page_count,
            "relevant_pages": meta.get("relevant_pages", [1]),
            "pdf_url": f"/api/v1/evidence/{ver.id}/pdf",
            "first_page_image_url": f"/api/v1/evidence/{ver.id}/1/image",
            "is_primary": sd.is_primary
        })
    data["verified_documents"] = verified_docs

    # Active human-verified eligibility rules with official page citations
    rules_res = await db.execute(
        select(EligibilityRule).where(
            EligibilityRule.scheme_id == scheme.scheme_id,
            EligibilityRule.status == "active"
        )
    )
    active_rules = []
    for r in rules_res.scalars().all():
        dep_res = await db.execute(select(RuleDocumentDependency).where(RuleDocumentDependency.rule_id == r.id))
        dep = dep_res.scalars().first()
        active_rules.append({
            "id": r.id,
            "rule_code": r.rule_code,
            "version": r.version,
            "logic_expression": r.logic_expression,
            "evidence_quote": r.evidence_quote,
            "page_reference": r.page_reference,
            "document_version_id": dep.document_version_id if dep else None
        })
    data["active_rules"] = active_rules

    return success_response(data=data, request_id=request_id)
