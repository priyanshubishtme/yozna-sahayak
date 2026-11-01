"""Admin Review Queue API & Document Verification Lifecycle.

Enforces Blueprint Section 5.1 - 5.5 and Phase 3 Gate Rules:
- Candidates remain in pending_review until human approval.
- Approving a candidate creates an official Document and immutable DocumentVersion.
- Superseding a document automatically invalidates dependent rules to 'needs_review'.
- Rejecting records reasons and audit logs.
- Unapproved candidates are strictly isolated from public search.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.envelope import success_response
from backend.app.core.errors import AppException
from backend.app.db.base import utc_now
from backend.app.db.models import (
    AuditEvent,
    Document,
    DocumentReview,
    DocumentVersion,
    EligibilityRule,
    ResourceCandidate,
    RuleDocumentDependency,
    Scheme,
    SchemeDocument,
    Source
)
from backend.app.db.session import get_db
from backend.app.discovery.diff import DiffEngine
from backend.app.discovery.storage import storage_service

router = APIRouter(prefix="/admin/review-queue", tags=["Admin Review Queue"])


class CandidateApprovePayload(BaseModel):
    reviewer: str = Field(..., description="Identity of approving human reviewer")
    assigned_scheme_id: str = Field(..., description="Target scheme ID to link document to")
    document_title: Optional[str] = Field(None, description="Official title for document")
    document_type: str = Field("guideline", description="Document type: guideline | circular | notification | faq")
    notes: Optional[str] = Field(None, description="Review notes / regulatory justification")


class CandidateRejectPayload(BaseModel):
    reviewer: str = Field(..., description="Identity of reviewing admin")
    reason: str = Field(..., description="Reason for rejection")


class CandidateAssignSchemePayload(BaseModel):
    scheme_id: str = Field(..., description="Target scheme ID")


@router.get("")
async def list_review_queue(
    request: Request,
    status_filter: Optional[str] = Query(None, alias="status"),
    source_id: Optional[str] = Query(None),
    classification: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """Lists candidates awaiting review, filtered by status, source, or classification."""
    request_id = getattr(request.state, "request_id", "direct")
    query = select(ResourceCandidate, Source.name.label("source_name"))\
        .join(Source, ResourceCandidate.source_id == Source.source_id)\
        .order_by(desc(ResourceCandidate.created_at))\
        .limit(limit)

    if status_filter:
        query = query.where(ResourceCandidate.review_status == status_filter)
    if source_id:
        query = query.where(ResourceCandidate.source_id == source_id)
    if classification:
        query = query.where(ResourceCandidate.classification == classification)

    res = await db.execute(query)
    rows = res.all()

    items = []
    for cand, s_name in rows:
        items.append({
            "id": cand.id,
            "source_id": cand.source_id,
            "source_name": s_name,
            "run_id": cand.run_id,
            "canonical_url": cand.canonical_url,
            "original_url": cand.original_url,
            "content_type": cand.content_type,
            "binary_sha256": cand.binary_sha256,
            "normalized_text_sha256": cand.normalized_text_sha256,
            "title": cand.title,
            "issuer": cand.issuer,
            "detected_date": cand.detected_date,
            "classification": cand.classification,
            "review_status": cand.review_status,
            "review_notes": cand.review_notes,
            "assigned_scheme_id": cand.assigned_scheme_id,
            "created_at": cand.created_at.isoformat() if cand.created_at else None,
            "reviewed_at": cand.reviewed_at.isoformat() if cand.reviewed_at else None
        })

    return success_response(data=items, request_id=request_id)


@router.get("/{candidate_id}")
async def get_candidate_detail(
    candidate_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Returns candidate details, extracted text snippet, and diff against prior versions."""
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(
        select(ResourceCandidate, Source.name.label("source_name"))
        .join(Source, ResourceCandidate.source_id == Source.source_id)
        .where(ResourceCandidate.id == candidate_id)
    )
    row = res.first()
    if not row:
        raise AppException(code="CANDIDATE_NOT_FOUND", message=f"Candidate '{candidate_id}' not found", status_code=404)

    cand, s_name = row
    text_snippet = storage_service.get_text_snippet(cand.binary_sha256) or ""

    # Look for a prior candidate or verified version for diff calculation
    diff_data = None
    prior_res = await db.execute(
        select(ResourceCandidate)
        .where(
            ResourceCandidate.canonical_url == cand.canonical_url,
            ResourceCandidate.id != cand.id,
            ResourceCandidate.created_at < cand.created_at
        )
        .order_by(desc(ResourceCandidate.created_at))
    )
    prior_cand = prior_res.scalars().first()

    if prior_cand:
        old_text = storage_service.get_text_snippet(prior_cand.binary_sha256) or ""
        diff_data = DiffEngine.compute_text_diff(
            old_text=old_text,
            new_text=text_snippet,
            from_label=f"Prior Version ({prior_cand.id})",
            to_label=f"Candidate ({cand.id})"
        )

    # Check for impacted eligibility rules if candidate is assigned to a scheme
    impacted_rules = []
    if cand.assigned_scheme_id:
        rules_res = await db.execute(
            select(EligibilityRule).where(
                EligibilityRule.scheme_id == cand.assigned_scheme_id,
                EligibilityRule.status == "active"
            )
        )
        for r in rules_res.scalars().all():
            impacted_rules.append({
                "rule_id": r.id,
                "rule_code": r.rule_code,
                "status": r.status,
                "evidence_quote": r.evidence_quote[:120]
            })

    data = {
        "candidate": {
            "id": cand.id,
            "source_id": cand.source_id,
            "source_name": s_name,
            "run_id": cand.run_id,
            "canonical_url": cand.canonical_url,
            "original_url": cand.original_url,
            "content_type": cand.content_type,
            "binary_sha256": cand.binary_sha256,
            "normalized_text_sha256": cand.normalized_text_sha256,
            "title": cand.title,
            "issuer": cand.issuer,
            "detected_date": cand.detected_date,
            "classification": cand.classification,
            "review_status": cand.review_status,
            "review_notes": cand.review_notes,
            "assigned_scheme_id": cand.assigned_scheme_id,
            "created_at": cand.created_at.isoformat() if cand.created_at else None,
            "reviewed_at": cand.reviewed_at.isoformat() if cand.reviewed_at else None
        },
        "text_preview": text_snippet[:3000],
        "diff": diff_data,
        "impacted_rules": impacted_rules
    }
    return success_response(data=data, request_id=request_id)


@router.post("/{candidate_id}/approve")
async def approve_candidate(
    candidate_id: str,
    payload: CandidateApprovePayload,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Human approval of candidate resource.

    Guarantees (Blueprint Section 5.1 - 5.5):
    1. Creates/updates Document and creates immutable DocumentVersion in 'verified' status.
    2. Automatically invalidates dependent rules on superseded versions to 'needs_review'.
    3. Retains full audit log with reviewer identity and cryptographic fingerprints.
    """
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(select(ResourceCandidate).where(ResourceCandidate.id == candidate_id))
    cand = res.scalar_one_or_none()

    if not cand:
        raise AppException(code="CANDIDATE_NOT_FOUND", message=f"Candidate '{candidate_id}' not found", status_code=404)

    if cand.review_status == "approved":
        raise AppException(code="ALREADY_APPROVED", message="Candidate is already approved", status_code=400)

    # Validate target scheme exists
    scheme_res = await db.execute(select(Scheme).where(Scheme.scheme_id == payload.assigned_scheme_id))
    scheme = scheme_res.scalar_one_or_none()
    if not scheme:
        raise AppException(
            code="SCHEME_NOT_FOUND",
            message=f"Assigned scheme '{payload.assigned_scheme_id}' does not exist in registry",
            status_code=404
        )

    # 1. Check for existing Document for this scheme and document_type
    doc_query = select(Document).join(SchemeDocument, Document.id == SchemeDocument.document_id)\
        .where(
            SchemeDocument.scheme_id == payload.assigned_scheme_id,
            Document.document_type == payload.document_type
        )
    existing_doc_res = await db.execute(doc_query)
    doc = existing_doc_res.scalars().first()

    version_number = 1
    invalidated_rules_count = 0

    if not doc:
        # Create new logical document
        doc_id = f"doc-{uuid.uuid4().hex[:12]}"
        doc = Document(
            id=doc_id,
            title=payload.document_title or cand.title or f"{scheme.name_en} {payload.document_type.capitalize()}",
            document_type=payload.document_type,
            issuer=cand.issuer or scheme.ministry_or_dept,
            jurisdiction=scheme.level,
            status="verified"
        )
        db.add(doc)

        # Link to Scheme
        scheme_doc = SchemeDocument(
            scheme_id=payload.assigned_scheme_id,
            document_id=doc_id,
            is_primary=True,
            relationship_type="governing_guideline"
        )
        db.add(scheme_doc)
    else:
        # Document exists: look up previous versions
        vers_res = await db.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == doc.id)
            .order_by(desc(DocumentVersion.version_number))
        )
        prior_versions = vers_res.scalars().all()
        if prior_versions:
            latest_prior = prior_versions[0]
            version_number = latest_prior.version_number + 1

            # Invalidate dependent rules linked to old versions per Blueprint Section 5.3
            dep_res = await db.execute(
                select(RuleDocumentDependency)
                .where(RuleDocumentDependency.document_version_id == latest_prior.id)
            )
            dependencies = dep_res.scalars().all()

            for dep in dependencies:
                rule_res = await db.execute(select(EligibilityRule).where(EligibilityRule.id == dep.rule_id))
                rule = rule_res.scalar_one_or_none()
                if rule and rule.status == "active":
                    rule.status = "needs_review"
                    invalidated_rules_count += 1

            # Mark old version superseded
            latest_prior.status = "superseded_pending_review"

        doc.status = "verified"

    # 2. Create Immutable DocumentVersion
    ver_id = f"ver-{uuid.uuid4().hex[:12]}"
    ext = "pdf" if "pdf" in cand.content_type.lower() else "html"
    storage_key = f"data/pdfs/{cand.binary_sha256}.pdf" if ext == "pdf" else f"data/fetched/{cand.binary_sha256}.html"

    doc_version = DocumentVersion(
        id=ver_id,
        document_id=doc.id,
        version_number=version_number,
        binary_sha256=cand.binary_sha256,
        normalized_text_sha256=cand.normalized_text_sha256,
        storage_key=storage_key,
        content_type=cand.content_type,
        source_url=cand.canonical_url,
        final_url=cand.original_url,
        status="verified",
        created_by_job_id=cand.run_id
    )
    db.add(doc_version)

    # 3. Create DocumentReview Record
    review_record = DocumentReview(
        id=f"rev-{uuid.uuid4().hex[:12]}",
        document_version_id=ver_id,
        reviewer=payload.reviewer,
        decision="approved",
        notes=payload.notes or f"Approved candidate {cand.id} linked to {payload.assigned_scheme_id}"
    )
    db.add(review_record)

    # 4. Update Candidate Record
    cand.review_status = "approved"
    cand.reviewed_at = utc_now()
    cand.review_notes = payload.notes
    cand.assigned_scheme_id = payload.assigned_scheme_id

    # 5. Record Audit Event
    audit = AuditEvent(
        id=f"aud-{uuid.uuid4().hex[:12]}",
        actor=payload.reviewer,
        action="document_candidate_approved",
        resource_type="document_candidate",
        resource_id=candidate_id,
        details_json={
            "document_id": doc.id,
            "version_id": ver_id,
            "version_number": version_number,
            "scheme_id": payload.assigned_scheme_id,
            "binary_sha256": cand.binary_sha256,
            "invalidated_rules_count": invalidated_rules_count
        }
    )
    db.add(audit)

    await db.commit()

    return success_response(
        data={
            "candidate_id": cand.id,
            "document_id": doc.id,
            "document_version_id": ver_id,
            "version_number": version_number,
            "status": "approved_and_verified",
            "invalidated_rules_count": invalidated_rules_count
        },
        request_id=request_id
    )


@router.post("/{candidate_id}/reject")
async def reject_candidate(
    candidate_id: str,
    payload: CandidateRejectPayload,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Rejects candidate resource with recorded justification."""
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(select(ResourceCandidate).where(ResourceCandidate.id == candidate_id))
    cand = res.scalar_one_or_none()

    if not cand:
        raise AppException(code="CANDIDATE_NOT_FOUND", message=f"Candidate '{candidate_id}' not found", status_code=404)

    cand.review_status = "rejected"
    cand.reviewed_at = utc_now()
    cand.review_notes = payload.reason

    audit = AuditEvent(
        id=f"aud-{uuid.uuid4().hex[:12]}",
        actor=payload.reviewer,
        action="document_candidate_rejected",
        resource_type="document_candidate",
        resource_id=candidate_id,
        details_json={"reason": payload.reason}
    )
    db.add(audit)
    await db.commit()

    return success_response(
        data={"candidate_id": cand.id, "status": "rejected", "reason": payload.reason},
        request_id=request_id
    )


@router.post("/{candidate_id}/assign-scheme")
async def assign_scheme_to_candidate(
    candidate_id: str,
    payload: CandidateAssignSchemePayload,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Reassigns candidate to a scheme ID before approval."""
    request_id = getattr(request.state, "request_id", "direct")
    res = await db.execute(select(ResourceCandidate).where(ResourceCandidate.id == candidate_id))
    cand = res.scalar_one_or_none()

    if not cand:
        raise AppException(code="CANDIDATE_NOT_FOUND", message=f"Candidate '{candidate_id}' not found", status_code=404)

    # Validate scheme exists
    scheme_res = await db.execute(select(Scheme).where(Scheme.scheme_id == payload.scheme_id))
    if not scheme_res.scalar_one_or_none():
        raise AppException(code="SCHEME_NOT_FOUND", message=f"Scheme '{payload.scheme_id}' not found", status_code=404)

    cand.assigned_scheme_id = payload.scheme_id
    await db.commit()

    return success_response(
        data={"candidate_id": cand.id, "assigned_scheme_id": cand.assigned_scheme_id},
        request_id=request_id
    )
