"""Tests for Phase 5: Structured Schemes, Eligibility Rule Trees, and Invalidation Review Console."""

import uuid
import pytest
from sqlalchemy import select
from backend.app.db.models import (
    Document,
    DocumentVersion,
    EligibilityRule,
    RuleDocumentDependency,
    RuleReview,
    Scheme
)
from backend.app.db.session import AsyncSessionLocal
from backend.app.rules.schema import (
    ConditionLeaf,
    OperatorType,
    RuleCreateRequest,
    RuleReviewDecision,
    RuleTreePayload
)
from backend.app.rules.service import rule_service


@pytest.mark.asyncio
async def test_initial_13_schemes_structure():
    """Gate test: 13 initial schemes are seeded and have correct attributes, categories, and initial modes."""
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Scheme))
        schemes = res.scalars().all()

        assert len(schemes) >= 13, f"Expected at least 13 seeded schemes, found {len(schemes)}"

        # Check required attributes on all schemes
        for s in schemes:
            assert s.scheme_id.startswith("SCHEME-")
            assert s.name_en != ""
            assert s.name_hi != ""
            assert s.category != ""
            assert s.level in ["central", "state"]
            assert s.initial_mode in ["rules_and_rag", "rag_and_rules", "rag_only"]

        # Schemes with verified seeded rules must have rules_enabled=True
        pmkisan = next(s for s in schemes if s.scheme_id == "SCHEME-PM-KISAN")
        assert pmkisan.rules_enabled is True

        pmjay = next(s for s in schemes if s.scheme_id == "SCHEME-PM-JAY")
        assert pmjay.rules_enabled is True


@pytest.mark.asyncio
async def test_active_rule_provenance_gate():
    """Gate test: Every active rule strictly requires a verified quote and official page number."""
    async with AsyncSessionLocal() as db:
        # Fetch all active rules
        res = await db.execute(select(EligibilityRule).where(EligibilityRule.status == "active"))
        active_rules = res.scalars().all()

        assert len(active_rules) >= 4, "Must have active verified rules for initial core schemes"

        for r in active_rules:
            # 1. Non-empty verbatim quote
            assert r.evidence_quote is not None
            assert len(r.evidence_quote.strip()) >= 10, f"Rule {r.id} missing evidence quote"

            # 2. Official PDF page reference
            assert r.page_reference is not None
            assert r.page_reference >= 1, f"Rule {r.id} missing valid page reference"

            # 3. Document version dependency
            dep_res = await db.execute(select(RuleDocumentDependency).where(RuleDocumentDependency.rule_id == r.id))
            deps = dep_res.scalars().all()
            assert len(deps) > 0, f"Rule {r.id} has no document dependency link"

            for d in deps:
                assert d.document_version_id != ""
                assert d.page_number == r.page_reference


@pytest.mark.asyncio
async def test_rule_approval_fails_without_evidence_quote_or_page():
    """Gate test: Rule cannot be approved without a verified quote and page number."""
    async with AsyncSessionLocal() as db:
        # Create an incomplete rule without quote
        incomplete_rule_id = f"rule-test-incomp-{uuid.uuid4().hex[:8]}"
        incomplete_rule = EligibilityRule(
            id=incomplete_rule_id,
            scheme_id="SCHEME-PM-KISAN",
            rule_code=f"PMK-FAIL-{uuid.uuid4().hex[:6]}",
            version=1,
            rule_json={"all": [{"field": "age", "op": "greater_than_or_equal", "value": 18}]},
            logic_expression="(age >= 18)",
            status="pending_review",
            evidence_quote="",  # Empty quote!
            page_reference=None  # Missing page!
        )
        db.add(incomplete_rule)
        await db.commit()

        try:
            # Attempting to approve must raise AppException with RULE_EVIDENCE_MISSING
            with pytest.raises(Exception) as exc_info:
                await rule_service.review_rule(
                    db=db,
                    rule_id=incomplete_rule_id,
                    review_data=RuleReviewDecision(decision="approve", reviewer="test_reviewer")
                )
            assert getattr(exc_info.value, "code", "") == "RULE_EVIDENCE_MISSING"
        finally:
            await db.delete(incomplete_rule)
            await db.commit()


@pytest.mark.asyncio
async def test_source_change_invalidates_dependent_rules():
    """Gate test: Changed source version automatically disables impacted rules (marks needs_review) until re-approved."""
    async with AsyncSessionLocal() as db:
        # Create test document and version
        test_doc_id = f"doc-inval-test-{uuid.uuid4().hex[:8]}"
        test_doc = Document(id=test_doc_id, title="Test Scheme Guidelines", document_type="guideline", status="verified")
        db.add(test_doc)

        ver1_id = f"ver-inval-test-v1-{uuid.uuid4().hex[:8]}"
        ver1 = DocumentVersion(
            id=ver1_id,
            document_id=test_doc_id,
            version_number=1,
            binary_sha256="dummy_sha1",
            storage_key="data/pdfs/dummy1.pdf",
            source_url="https://test.gov.in/v1.pdf",
            status="verified"
        )
        db.add(ver1)

        # Create active rule linked to ver1
        rule_id = f"rule-inval-test-{uuid.uuid4().hex[:8]}"
        rule = EligibilityRule(
            id=rule_id,
            scheme_id="SCHEME-PM-KISAN",
            rule_code=f"PMK-INVAL-{uuid.uuid4().hex[:6]}",
            version=1,
            rule_json={"all": [{"field": "age", "op": "greater_than_or_equal", "value": 21}]},
            logic_expression="(age >= 21)",
            status="active",
            evidence_quote="Age must be 21 or older as per test guidelines 2024.",
            page_reference=1
        )
        db.add(rule)
        await db.flush()

        dep = RuleDocumentDependency(rule_id=rule.id, document_version_id=ver1_id, page_number=1)
        db.add(dep)
        await db.commit()

        try:
            # Verify rule is active
            await db.refresh(rule)
            assert rule.status == "active"

            # SIMULATE SOURCE CHANGE: ver1 is superseded by ver2
            invalidated_ids = await rule_service.invalidate_dependent_rules(
                db=db,
                document_version_id=ver1_id,
                reason="new_version_published"
            )

            assert rule_id in invalidated_ids

            # Verify rule transitioned to needs_review immediately
            await db.refresh(rule)
            assert rule.status == "needs_review"

            # Check audit trail
            rev_res = await db.execute(select(RuleReview).where(RuleReview.rule_id == rule_id))
            reviews = rev_res.scalars().all()
            assert any("Automatically marked needs_review" in r.notes for r in reviews)

            # Re-approval should FAIL if still pointing to outdated version
            ver1.status = "superseded_pending_review"
            await db.commit()

            with pytest.raises(Exception) as exc_info:
                await rule_service.review_rule(
                    db=db,
                    rule_id=rule_id,
                    review_data=RuleReviewDecision(decision="approve", reviewer="qa_admin")
                )
            assert getattr(exc_info.value, "code", "") == "RULE_DEPENDENCY_OUTDATED"

            # Update dependency to point to current verified version ver-doc-pmkisan-gu-v1
            dep.document_version_id = "ver-doc-pmkisan-gu-v1"
            await db.commit()

            # Now re-approval succeeds!
            approved_rule = await rule_service.review_rule(
                db=db,
                rule_id=rule_id,
                review_data=RuleReviewDecision(decision="approve", reviewer="qa_admin")
            )
            assert approved_rule.status == "active"

        finally:
            # Clean up test entities
            await db.delete(dep)
            await db.delete(rule)
            await db.delete(ver1)
            await db.delete(test_doc)
            await db.commit()


@pytest.mark.asyncio
async def test_rule_tree_validation_and_operators():
    """Gate test: Validates rich logical operators and nested all/any trees."""
    # Test valid between_inclusive
    leaf1 = ConditionLeaf(
        field="age",
        op=OperatorType.BETWEEN_INCLUSIVE,
        min=18,
        max=60
    )
    assert leaf1.min == 18
    assert leaf1.max == 60

    # Test invalid between_inclusive (min > max)
    with pytest.raises(ValueError):
        ConditionLeaf(
            field="age",
            op=OperatorType.BETWEEN_INCLUSIVE,
            min=65,
            max=20
        )

    # Test valid in_list
    leaf2 = ConditionLeaf(
        field="state",
        op=OperatorType.IN_LIST,
        list=["UK", "UP", "HR"]
    )
    assert "UK" in leaf2.list

    # Test logic expression generation
    expr = rule_service.generate_logic_expression({
        "all": [
            {"field": "age", "op": "greater_than_or_equal", "value": 18},
            {"field": "owns_cultivable_land", "op": "equals", "value": True}
        ],
        "exceptions": [
            {"field": "is_institutional_landholder", "op": "equals", "value": True}
        ]
    })
    assert "(age >= 18)" in expr
    assert "(owns_cultivable_land == True)" in expr
    assert "NOT ((is_institutional_landholder == True))" in expr
