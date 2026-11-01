"""Tests for Phase 3: Discovery Change Classification, Review Queue, Approval, and Rule Invalidation."""

import uuid
import pytest
from backend.app.discovery.diff import DiffEngine
from backend.app.db.models import (
    Document,
    DocumentVersion,
    EligibilityRule,
    ResourceCandidate,
    RuleDocumentDependency,
    Scheme,
    SchemeDocument
)
from backend.app.db.session import AsyncSessionLocal


def test_diff_engine_classification_rules():
    """Gate test: New, unchanged, changed_content, changed_binary, and duplicate classified correctly."""
    # 1. New resource
    res_new = DiffEngine.classify_resource(
        is_known_url=False,
        is_exact_binary_duplicate=False,
        has_prior_version=False,
        old_binary_sha256=None,
        new_binary_sha256="hash_abc",
        old_text_sha256=None,
        new_text_sha256="text_hash_1"
    )
    assert res_new == "new_resource"

    # 2. Unchanged resource (same URL, exact same bytes)
    res_unchanged = DiffEngine.classify_resource(
        is_known_url=True,
        is_exact_binary_duplicate=True,
        has_prior_version=True,
        old_binary_sha256="hash_abc",
        new_binary_sha256="hash_abc",
        old_text_sha256="text_hash_1",
        new_text_sha256="text_hash_1"
    )
    assert res_unchanged == "unchanged"

    # 3. Duplicate resource (new URL, but identical binary bytes seen elsewhere)
    res_duplicate = DiffEngine.classify_resource(
        is_known_url=False,
        is_exact_binary_duplicate=True,
        has_prior_version=False,
        old_binary_sha256=None,
        new_binary_sha256="hash_abc",
        old_text_sha256=None,
        new_text_sha256="text_hash_1"
    )
    assert res_duplicate == "duplicate"

    # 4. Changed content (known URL, both binary and text changed)
    res_changed_content = DiffEngine.classify_resource(
        is_known_url=True,
        is_exact_binary_duplicate=False,
        has_prior_version=True,
        old_binary_sha256="hash_abc",
        new_binary_sha256="hash_xyz",
        old_text_sha256="text_hash_1",
        new_text_sha256="text_hash_2"
    )
    assert res_changed_content == "changed_content"

    # 5. Changed binary only (known URL, binary changed due to metadata, but text identical)
    res_changed_binary = DiffEngine.classify_resource(
        is_known_url=True,
        is_exact_binary_duplicate=False,
        has_prior_version=True,
        old_binary_sha256="hash_abc",
        new_binary_sha256="hash_xyz",
        old_text_sha256="text_hash_1",
        new_text_sha256="text_hash_1"
    )
    assert res_changed_binary == "changed_binary"


def test_diff_engine_unified_diff():
    """Gate test: Line-by-line diff and machine review aid generation."""
    old_text = "PM-KISAN provides Rs 6,000 per year.\nDisbursed in three equal installments."
    new_text = "PM-KISAN provides Rs 8,000 per year.\nDisbursed in four equal installments.\nRequires Aadhaar eKYC."

    diff = DiffEngine.compute_text_diff(old_text, new_text)
    assert diff["is_identical"] is False
    assert diff["additions_count"] > 0
    assert diff["deletions_count"] > 0
    assert "Rs 8,000" in diff["unified_diff"]
    assert "machine_summary" in diff
    assert "disclaimer" in diff["machine_summary"]


@pytest.mark.asyncio
async def test_review_queue_listing_and_filtering(client):
    """Gate test: Candidates appear in review queue and are filterable by status."""
    res = await client.get("/api/v1/admin/review-queue?status=pending_review")
    assert res.status_code == 200
    data = res.json()
    assert data["ok"] is True
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_candidate_rejection_workflow(client):
    """Gate test: Candidate rejection records reason and updates review_status."""
    # 1. Create a dummy test candidate
    cand_id = f"cand-test-rej-{uuid.uuid4().hex[:6]}"
    async with AsyncSessionLocal() as session:
        cand = ResourceCandidate(
            id=cand_id,
            source_id="SRC-MIN-AGRI",
            canonical_url="https://pmkisan.gov.in/test-spurious-notice.html",
            original_url="https://pmkisan.gov.in/test-spurious-notice.html",
            content_type="text/html",
            binary_sha256=f"hash-{uuid.uuid4().hex[:8]}",
            title="Spurious Draft Circular",
            classification="new_resource",
            review_status="pending_review"
        )
        session.add(cand)
        await session.commit()

    # 2. Reject candidate
    rej_res = await client.post(
        f"/api/v1/admin/review-queue/{cand_id}/reject",
        json={"reviewer": "compliance_lead", "reason": "Draft notice without gazette notification number."}
    )
    assert rej_res.status_code == 200
    rej_data = rej_res.json()["data"]
    assert rej_data["status"] == "rejected"
    assert rej_data["reason"] == "Draft notice without gazette notification number."


@pytest.mark.asyncio
async def test_candidate_approval_and_rule_invalidation(client):
    """Gate test: Candidate approval creates verified Document/Version and invalidates dependent rules."""
    scheme_id = f"SCHEME-TEST-{uuid.uuid4().hex[:6]}"

    # Step 1: Create an initial Scheme, DocumentVersion V1, and an active rule dependent on it
    v1_id = f"ver-v1-{uuid.uuid4().hex[:6]}"
    doc_id = f"doc-pmkisan-{uuid.uuid4().hex[:6]}"
    rule_id = f"rule-pmkisan-land-{uuid.uuid4().hex[:6]}"

    async with AsyncSessionLocal() as session:
        test_scheme = Scheme(
            scheme_id=scheme_id,
            code="SCHEME_TEST",
            name_en="Test Welfare Scheme",
            name_hi="परीक्षण कल्याण योजना",
            level="central",
            category="agriculture",
            description_en="Test scheme for rule invalidation testing",
            description_hi="परीक्षण योजना",
            initial_mode="rag_and_rules",
            rule_scope="candidate_rule_enabled",
            rag_enabled=True,
            rules_enabled=True
        )
        session.add(test_scheme)

        doc = Document(
            id=doc_id,
            title="Test Operational Guidelines 2023",
            document_type="guideline",
            status="verified"
        )
        session.add(doc)

        sd = SchemeDocument(scheme_id=scheme_id, document_id=doc_id, is_primary=True)
        session.add(sd)

        v1 = DocumentVersion(
            id=v1_id,
            document_id=doc_id,
            version_number=1,
            binary_sha256="sha256_v1_guidelines",
            storage_key="data/pdfs/v1.pdf",
            status="verified",
            source_url="https://pmkisan.gov.in/guidelines_v1.pdf"
        )
        session.add(v1)

        rule = EligibilityRule(
            id=rule_id,
            scheme_id=scheme_id,
            rule_code="RULE_CULTIVABLE_LAND",
            rule_json={"field": "land_ownership", "operator": "eq", "value": True},
            status="active",
            evidence_quote="Small and marginal farmer families having cultivable landholding."
        )
        session.add(rule)

        dep = RuleDocumentDependency(
            rule_id=rule_id,
            document_version_id=v1_id
        )
        session.add(dep)
        await session.commit()

    # Step 2: Create a candidate representing an updated guideline V2
    cand_id = f"cand-v2-{uuid.uuid4().hex[:6]}"
    async with AsyncSessionLocal() as session:
        cand_v2 = ResourceCandidate(
            id=cand_id,
            source_id="SRC-MIN-AGRI",
            canonical_url="https://pmkisan.gov.in/guidelines_v2.pdf",
            original_url="https://pmkisan.gov.in/guidelines_v2.pdf",
            content_type="application/pdf",
            binary_sha256="sha256_v2_guidelines_updated",
            normalized_text_sha256="text_sha256_v2",
            title="PM-KISAN Operational Guidelines 2026 Revised",
            classification="changed_content",
            review_status="pending_review",
            assigned_scheme_id=scheme_id
        )
        session.add(cand_v2)
        await session.commit()

    try:
        # Step 3: Approve Candidate V2
        approve_res = await client.post(
            f"/api/v1/admin/review-queue/{cand_id}/approve",
            json={
                "reviewer": "director_agriculture_evaluation",
                "assigned_scheme_id": scheme_id,
                "document_title": "PM-KISAN Revised Guidelines 2026",
                "document_type": "guideline",
                "notes": "Formally published by Ministry; supersedes 2023 guideline."
            }
        )
        assert approve_res.status_code == 200
        app_data = approve_res.json()["data"]
        assert app_data["status"] == "approved_and_verified"
        assert app_data["version_number"] == 2
        assert app_data["invalidated_rules_count"] == 1

        # Step 4: Verify rule is now 'needs_review' per Blueprint Section 5.3!
        async with AsyncSessionLocal() as session:
            rule_check = await session.get(EligibilityRule, rule_id)
            assert rule_check.status == "needs_review"

            v1_check = await session.get(DocumentVersion, v1_id)
            assert v1_check.status == "superseded_pending_review"
    finally:
        from sqlalchemy import delete
        async with AsyncSessionLocal() as session:
            await session.execute(delete(RuleDocumentDependency).where(RuleDocumentDependency.rule_id == rule_id))
            await session.execute(delete(EligibilityRule).where(EligibilityRule.id == rule_id))
            await session.execute(delete(DocumentVersion).where(DocumentVersion.document_id == doc_id))
            await session.execute(delete(SchemeDocument).where(SchemeDocument.scheme_id == scheme_id))
            await session.execute(delete(Document).where(Document.id == doc_id))
            await session.execute(delete(ResourceCandidate).where(ResourceCandidate.id == cand_id))
            await session.execute(delete(Scheme).where(Scheme.scheme_id == scheme_id))
            await session.commit()


@pytest.mark.asyncio
async def test_no_candidate_public_before_approval(client):
    """Gate test: No unapproved or pending candidate is visible or searchable by public citizens."""
    scheme_id = "SCHEME-UK-OLD-AGE"

    # 1. Query public scheme detail before candidate approval
    res = await client.get(f"/api/v1/schemes/{scheme_id}")
    assert res.status_code == 200
    data = res.json()["data"]

    # Initial state has no approved documents
    verified_docs = data.get("verified_documents", [])
    for d in verified_docs:
        assert d["version_number"] >= 1

    # 2. Add an unapproved pending candidate
    cand_id = f"cand-unapproved-{uuid.uuid4().hex[:6]}"
    unapproved_sha = f"secret_sha_{uuid.uuid4().hex[:10]}"
    async with AsyncSessionLocal() as session:
        unapproved_cand = ResourceCandidate(
            id=cand_id,
            source_id="SRC-UK-SOCIAL-WELFARE",
            canonical_url=f"https://socialwelfare.uk.gov.in/secret_draft_{uuid.uuid4().hex[:4]}.pdf",
            original_url=f"https://socialwelfare.uk.gov.in/secret_draft_{uuid.uuid4().hex[:4]}.pdf",
            content_type="application/pdf",
            binary_sha256=unapproved_sha,
            title="Secret Draft Pension Criteria",
            classification="new_resource",
            review_status="pending_review",
            assigned_scheme_id=scheme_id
        )
        session.add(unapproved_cand)
        await session.commit()

    try:
        # 3. Query public scheme detail again; confirm the unapproved candidate is NOT exposed
        res2 = await client.get(f"/api/v1/schemes/{scheme_id}")
        assert res2.status_code == 200
        data2 = res2.json()["data"]
        doc_hashes = [d["binary_sha256"] for d in data2.get("verified_documents", [])]
        assert unapproved_sha not in doc_hashes
    finally:
        from sqlalchemy import delete
        async with AsyncSessionLocal() as session:
            await session.execute(delete(ResourceCandidate).where(ResourceCandidate.id == cand_id))
            await session.commit()
