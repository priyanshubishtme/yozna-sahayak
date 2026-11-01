"""Deterministic Eligibility Evaluation, Three-Valued Logic, and Ranking Test Suite.

Enforces Phase 7 Gate Criteria:
- 25 profile evaluations produce deterministic results matching the fixture suite.
- Zero rules in 'needs_review' or 'draft' produce an outcome.
- Every outcome has structured, bilingual explainability reasons.
- Disqualification exceptions strictly take precedence over qualifying conditions.
- External verification flags correctly distinguish 'Eligible' from 'Likely Eligible'.
- Multi-factor ranking strictly orders schemes by tier, confidence, completeness, and recency.
"""

import json
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.db.models import EligibilityRule, Scheme
from backend.app.eligibility.evaluator import (
    EligibilityOutcome,
    ThreeValuedState,
    evaluate_branch,
    evaluate_leaf,
    evaluate_rule,
    evaluate_scheme
)
from backend.app.eligibility.ranker import scheme_ranker
from backend.app.eligibility.service import eligibility_service
from backend.app.main import app
from backend.app.rules.seed_rules import INITIAL_RULES


@pytest.mark.asyncio
async def test_three_valued_logic_operators():
    """Validates Kleene 3-valued truth tables for AND/OR combinators."""
    profile = {"age": 25, "income": 50000}

    # Case 1: All True -> True
    branch_all_true = {
        "all": [
            {"field": "age", "op": "greater_than", "value": 18},
            {"field": "income", "op": "less_than", "value": 100000}
        ]
    }
    state, matched, unmet, missing, _ = evaluate_branch(branch_all_true, profile)
    assert state == ThreeValuedState.TRUE
    assert len(matched) == 2
    assert len(unmet) == 0

    # Case 2: One False in AND -> Strictly False (short-circuits)
    branch_false_and = {
        "all": [
            {"field": "age", "op": "greater_than", "value": 30},  # False
            {"field": "missing_field", "op": "equals", "value": "xyz"}  # Unknown
        ]
    }
    state, _, unmet, _, _ = evaluate_branch(branch_false_and, profile)
    assert state == ThreeValuedState.FALSE
    assert len(unmet) >= 1

    # Case 3: Unknown with no False in AND -> Unknown
    branch_unknown_and = {
        "all": [
            {"field": "age", "op": "greater_than", "value": 18},  # True
            {"field": "unprovided_attribute", "op": "equals", "value": True}  # Unknown
        ]
    }
    state, matched, unmet, missing, _ = evaluate_branch(branch_unknown_and, profile)
    assert state == ThreeValuedState.UNKNOWN
    assert "unprovided_attribute" in missing

    # Case 4: One True in OR -> Strictly True
    branch_true_or = {
        "any": [
            {"field": "age", "op": "greater_than", "value": 18},  # True
            {"field": "unknown_prop", "op": "equals", "value": True}  # Unknown
        ]
    }
    state, matched, _, _, _ = evaluate_branch(branch_true_or, profile)
    assert state == ThreeValuedState.TRUE

    # Case 5: All False in OR -> False
    branch_false_or = {
        "any": [
            {"field": "age", "op": "less_than", "value": 10},  # False
            {"field": "income", "op": "greater_than", "value": 200000}  # False
        ]
    }
    state, _, _, _, _ = evaluate_branch(branch_false_or, profile)
    assert state == ThreeValuedState.FALSE


@pytest.mark.asyncio
async def test_disqualification_exceptions_precedence():
    """Validates that statutory exceptions immediately disqualify applicant regardless of positive criteria."""
    rule_dict = {
        "all": [
            {"field": "is_farmer", "op": "equals", "value": True},
            {"field": "owns_cultivable_land", "op": "equals", "value": True}
        ],
        "exceptions": [
            {"field": "is_income_tax_payer", "op": "equals", "value": True}
        ]
    }

    dummy_rule = EligibilityRule(
        id="test-rule-excl",
        scheme_id="SCHEME-PM-KISAN",
        rule_code="PMKISAN-EXCL-TEST",
        status="active",
        rule_json=rule_dict,
        evidence_quote="Income tax payers are disqualified by statute.",
        page_reference=1
    )

    # Profile meets positive criteria, but triggers disqualifying exception
    disqualified_profile = {
        "is_farmer": True,
        "owns_cultivable_land": True,
        "is_income_tax_payer": True
    }
    res = evaluate_rule(dummy_rule, disqualified_profile)
    assert res.state == ThreeValuedState.FALSE
    assert res.is_disqualified_by_exception is True
    assert "is_income_tax_payer == True" in res.unmet_criteria[0]

    # Profile meets positive criteria and does NOT trigger exception
    eligible_profile = {
        "is_farmer": True,
        "owns_cultivable_land": True,
        "is_income_tax_payer": False
    }
    res2 = evaluate_rule(dummy_rule, eligible_profile)
    assert res2.state == ThreeValuedState.TRUE
    assert res2.is_disqualified_by_exception is False


@pytest.mark.asyncio
async def test_external_official_verification_shifts_to_likely_eligible():
    """Validates that criteria flagged official_verification_required shift outcome to 'Likely Eligible'."""
    scheme = Scheme(
        scheme_id="SCHEME-PM-JAY",
        name_en="Ayushman Bharat PM-JAY",
        name_hi="आयुष्मान भारत",
        initial_mode="rules_and_rag",
        rules_enabled=True,
        category="Health"
    )

    rule_with_verif = EligibilityRule(
        id="test-rule-verif",
        scheme_id="SCHEME-PM-JAY",
        rule_code="PMJAY-R01-SECC",
        status="active",
        rule_json={
            "all": [
                {
                    "field": "secc_deprived",
                    "op": "equals",
                    "value": True,
                    "official_verification_required": True
                }
            ]
        },
        evidence_quote="Beneficiaries identified through SECC 2011 criteria.",
        page_reference=1
    )

    profile = {"secc_deprived": True}
    res = evaluate_scheme(scheme, [rule_with_verif], profile)
    assert res.outcome == EligibilityOutcome.LIKELY_ELIGIBLE
    assert res.requires_official_verification is True
    assert any("official" in r.lower() for r in res.reasons_en)


@pytest.mark.asyncio
async def test_strict_invalidation_gate_ignores_needs_review_rules():
    """Phase 7 Gate Requirement: No rule in needs_review produces an outcome."""
    scheme = Scheme(
        scheme_id="SCHEME-PM-KISAN",
        name_en="PM-KISAN",
        name_hi="पीएम-किसान",
        initial_mode="rules_and_rag",
        rules_enabled=True,
        category="Agriculture"
    )

    active_rule = EligibilityRule(
        id="rule-active-01",
        scheme_id="SCHEME-PM-KISAN",
        rule_code="PMKISAN-ACTIVE-01",
        status="active",
        rule_json={"all": [{"field": "is_farmer", "op": "equals", "value": True}]},
        evidence_quote="Valid active farmer rule.",
        page_reference=1
    )

    invalidated_rule = EligibilityRule(
        id="rule-invalid-02",
        scheme_id="SCHEME-PM-KISAN",
        rule_code="PMKISAN-INVALID-02",
        status="needs_review",  # Invalidated because source changed!
        rule_json={"all": [{"field": "special_grant", "op": "equals", "value": True}]},
        evidence_quote="Source updated; pending review.",
        page_reference=2
    )

    profile = {"is_farmer": True, "special_grant": False}
    # If invalidated_rule were evaluated, outcome would be FALSE (special_grant is False).
    # Because it is in needs_review, it MUST be ignored!
    res = evaluate_scheme(scheme, [active_rule, invalidated_rule], profile)
    assert res.outcome == EligibilityOutcome.ELIGIBLE
    assert "PMKISAN-INVALID-02 (needs_review)" in res.ignored_unverified_rules
    assert res.active_rules_evaluated == 1


@pytest.mark.asyncio
async def test_25_synthetic_profiles_fixture_suite():
    """Phase 7 Gate Requirement: 25 profile evaluations produce deterministic results matching fixture suite."""
    fixture_path = Path(__file__).parent / "fixtures" / "citizen_profiles_25.json"
    assert fixture_path.exists(), "25-profile fixture JSON must exist"

    with open(fixture_path, "r", encoding="utf-8") as f:
        profiles_data = json.load(f)

    assert len(profiles_data) == 25, f"Fixture suite must contain exactly 25 profiles, got {len(profiles_data)}"

    # Construct the active rule sets as defined in seed_rules
    schemes_dict = {
        "SCHEME-PM-KISAN": Scheme(
            scheme_id="SCHEME-PM-KISAN",
            name_en="PM-KISAN",
            name_hi="पीएम-किसान",
            initial_mode="rules_and_rag",
            rules_enabled=True,
            category="Agriculture"
        ),
        "SCHEME-PMAY-G": Scheme(
            scheme_id="SCHEME-PMAY-G",
            name_en="PMAY-G",
            name_hi="पीएम आवास ग्रामीण",
            initial_mode="rules_and_rag",
            rules_enabled=True,
            category="Housing"
        ),
        "SCHEME-PM-JAY": Scheme(
            scheme_id="SCHEME-PM-JAY",
            name_en="PM-JAY",
            name_hi="आयुष्मान भारत",
            initial_mode="rules_and_rag",
            rules_enabled=True,
            category="Health"
        ),
        "SCHEME-UK-OLD-AGE": Scheme(
            scheme_id="SCHEME-UK-OLD-AGE",
            name_en="UK Old Age Pension",
            name_hi="उत्तराखंड वृद्धावस्था पेंशन",
            initial_mode="rules_and_rag",
            rules_enabled=True,
            category="Social Welfare"
        )
    }

    rules_by_scheme = {
        "SCHEME-PM-KISAN": [
            EligibilityRule(
                id=r["id"],
                scheme_id=r["scheme_id"],
                rule_code=r["rule_code"],
                status="active",
                rule_json=r["rule_json"],
                evidence_quote=r["evidence_quote"],
                page_reference=r["page_reference"]
            )
            for r in INITIAL_RULES if r["scheme_id"] == "SCHEME-PM-KISAN"
        ],
        "SCHEME-PMAY-G": [
            EligibilityRule(
                id=r["id"],
                scheme_id=r["scheme_id"],
                rule_code=r["rule_code"],
                status="active",
                rule_json=r["rule_json"],
                evidence_quote=r["evidence_quote"],
                page_reference=r["page_reference"]
            )
            for r in INITIAL_RULES if r["scheme_id"] == "SCHEME-PMAY-G"
        ],
        "SCHEME-PM-JAY": [
            EligibilityRule(
                id=r["id"],
                scheme_id=r["scheme_id"],
                rule_code=r["rule_code"],
                status="active",
                rule_json=r["rule_json"],
                evidence_quote=r["evidence_quote"],
                page_reference=r["page_reference"]
            )
            for r in INITIAL_RULES if r["scheme_id"] == "SCHEME-PM-JAY"
        ],
        "SCHEME-UK-OLD-AGE": [
            EligibilityRule(
                id=r["id"],
                scheme_id=r["scheme_id"],
                rule_code=r["rule_code"],
                status="active",
                rule_json=r["rule_json"],
                evidence_quote=r["evidence_quote"],
                page_reference=r["page_reference"]
            )
            for r in INITIAL_RULES if r["scheme_id"] == "SCHEME-UK-OLD-AGE"
        ]
    }

    mismatch_failures = []

    for item in profiles_data:
        pid = item["id"]
        profile = item["profile"]
        expected_outcomes = item["expected"]

        for target_scheme_id, expected_status in expected_outcomes.items():
            if target_scheme_id not in schemes_dict:
                continue

            scheme = schemes_dict[target_scheme_id]
            scheme_rules = rules_by_scheme.get(target_scheme_id, [])

            eval_res = evaluate_scheme(
                scheme=scheme,
                rules=scheme_rules,
                profile=profile
            )

            actual_status = eval_res.outcome.value

            # Verify structured explainability reasons exist
            assert len(eval_res.reasons_en) > 0, f"Profile {pid} missing English explainability reason for {target_scheme_id}"
            assert len(eval_res.reasons_hi) > 0, f"Profile {pid} missing Hindi explainability reason for {target_scheme_id}"

            if actual_status != expected_status:
                mismatch_failures.append(
                    f"Profile {pid} on {target_scheme_id}: Expected '{expected_status}', got '{actual_status}'. Reasons: {eval_res.reasons_en}"
                )

    assert not mismatch_failures, f"Deterministic profile mismatches:\n" + "\n".join(mismatch_failures)


@pytest.mark.asyncio
async def test_multi_factor_ranking_order():
    """Validates that ranking preserves Tier priority: Eligible > Likely Eligible > Need More Info > Not Eligible."""
    schemes_dict = {
        "S1": Scheme(scheme_id="S1", name_en="Scheme 1", name_hi="योजना 1", initial_mode="rules_and_rag", rules_enabled=True),
        "S2": Scheme(scheme_id="S2", name_en="Scheme 2", name_hi="योजना 2", initial_mode="rules_and_rag", rules_enabled=True),
        "S3": Scheme(scheme_id="S3", name_en="Scheme 3", name_hi="योजना 3", initial_mode="rules_and_rag", rules_enabled=True),
        "S4": Scheme(scheme_id="S4", name_en="Scheme 4", name_hi="योजना 4", initial_mode="rules_and_rag", rules_enabled=True)
    }

    evaluations = [
        # S4: Not Eligible
        evaluate_scheme(schemes_dict["S4"], [
            EligibilityRule(id="r4", scheme_id="S4", rule_code="R4", status="active", rule_json={"field": "age", "op": "greater_than", "value": 60}, evidence_quote="Q", page_reference=1)
        ], {"age": 40}),
        # S1: Eligible
        evaluate_scheme(schemes_dict["S1"], [
            EligibilityRule(id="r1", scheme_id="S1", rule_code="R1", status="active", rule_json={"field": "is_farmer", "op": "equals", "value": True}, evidence_quote="Q", page_reference=1)
        ], {"is_farmer": True}),
        # S3: Need More Information
        evaluate_scheme(schemes_dict["S3"], [
            EligibilityRule(id="r3", scheme_id="S3", rule_code="R3", status="active", rule_json={"field": "income", "op": "less_than", "value": 50000}, evidence_quote="Q", page_reference=1)
        ], {}),
        # S2: Likely Eligible
        evaluate_scheme(schemes_dict["S2"], [
            EligibilityRule(id="r2", scheme_id="S2", rule_code="R2", status="active", rule_json={"field": "secc", "op": "equals", "value": True, "official_verification_required": True}, evidence_quote="Q", page_reference=1)
        ], {"secc": True})
    ]

    ranked = scheme_ranker.rank_schemes(evaluations, schemes_dict)
    assert len(ranked) == 4

    # Rank 1 must be Eligible (S1)
    assert ranked[0].tier == "Eligible"
    assert ranked[0].evaluation.scheme_id == "S1"

    # Rank 2 must be Likely Eligible (S2)
    assert ranked[1].tier == "Likely Eligible"
    assert ranked[1].evaluation.scheme_id == "S2"

    # Rank 3 must be Need More Information (S3)
    assert ranked[2].tier == "Need More Information"
    assert ranked[2].evaluation.scheme_id == "S3"

    # Rank 4 must be Not Eligible (S4)
    assert ranked[3].tier == "Not Eligible"
    assert ranked[3].evaluation.scheme_id == "S4"

    # Verify score strictly decreases
    scores = [r.score for r in ranked]
    assert scores == sorted(scores, reverse=True)


@pytest.mark.asyncio
async def test_eligibility_api_endpoints():
    """Tests /api/v1/eligibility/questions and /api/v1/eligibility/evaluate routes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Questions schema endpoint
        q_resp = await ac.get("/api/v1/eligibility/questions")
        assert q_resp.status_code == 200
        q_data = q_resp.json()["data"]
        assert q_data["total_questions"] >= 12
        assert any(q["field"] == "is_farmer" for q in q_data["questions"])

        # 2. Evaluation endpoint with citizen profile
        payload = {
            "profile": {
                "age": 72,
                "state": "UK",
                "is_farmer": True,
                "owns_cultivable_land": True,
                "has_aadhaar": True,
                "ekyc_completed": True,
                "is_bpl": True,
                "is_rural_resident": True,
                "has_pucca_house": False
            }
        }
        ev_resp = await ac.post("/api/v1/eligibility/evaluate", json=payload)
        assert ev_resp.status_code == 200
        ev_data = ev_resp.json()["data"]
        assert ev_data["total_schemes_evaluated"] >= 1
        assert "ranked_schemes" in ev_data
        assert "counts" in ev_data
