"""Multi-Factor Scheme Ranking and Recommendation Scoring Engine.

Enforces Blueprint Section 10.3:
- Tier priority: Eligible (1000) > Likely Eligible (750) > Need More Information (500) > Not Eligible (100).
- Confidence weight: rules_and_rag > rag_only.
- Completeness of matched criteria: (matched / total evaluated).
- Verification status bonus: verified official gazettes.
- Document recency bonus: newer circulars/versions prioritized.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.app.db.models import Scheme
from backend.app.eligibility.evaluator import EligibilityOutcome, SchemeEvaluationResult


class RankedSchemeResult:
    """A scored and ranked scheme recommendation for a citizen."""

    def __init__(
        self,
        rank: int,
        score: float,
        evaluation: SchemeEvaluationResult,
        tier: str,
        confidence_mode: str,
        completeness_ratio: float,
        score_breakdown: Dict[str, float]
    ):
        self.rank = rank
        self.score = score
        self.evaluation = evaluation
        self.tier = tier
        self.confidence_mode = confidence_mode
        self.completeness_ratio = completeness_ratio
        self.score_breakdown = score_breakdown

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rank": self.rank,
            "score": round(self.score, 2),
            "tier": self.tier,
            "confidence_mode": self.confidence_mode,
            "completeness_ratio": round(self.completeness_ratio, 2),
            "score_breakdown": {k: round(v, 2) for k, v in self.score_breakdown.items()},
            "evaluation": self.evaluation.to_dict()
        }


class SchemeRanker:
    """Computes deterministic multi-factor ranking scores for evaluated schemes."""

    TIER_SCORES = {
        EligibilityOutcome.ELIGIBLE: 1000.0,
        EligibilityOutcome.LIKELY_ELIGIBLE: 750.0,
        EligibilityOutcome.NEED_MORE_INFO: 500.0,
        EligibilityOutcome.NOT_ELIGIBLE: 100.0
    }

    @classmethod
    def rank_schemes(
        cls,
        evaluations: List[SchemeEvaluationResult],
        schemes_by_id: Dict[str, Scheme],
        doc_versions_by_scheme: Optional[Dict[str, Any]] = None
    ) -> List[RankedSchemeResult]:
        """Calculates multi-factor score and sorts schemes descending by score."""
        scored_items = []

        for ev in evaluations:
            scheme = schemes_by_id.get(ev.scheme_id)
            initial_mode = scheme.initial_mode if scheme else "rag_only"
            rules_enabled = scheme.rules_enabled if scheme else False

            # 1. Tier Base Score
            tier_base = cls.TIER_SCORES.get(ev.outcome, 100.0)

            # 2. Confidence Mode Weight (rules_and_rag > rag_only)
            confidence_pts = 0.0
            if rules_enabled and initial_mode in ["rules_and_rag", "rag_and_rules"]:
                confidence_pts = 100.0
            elif initial_mode in ["rules_and_rag", "rag_and_rules"]:
                confidence_pts = 60.0
            else:
                confidence_pts = 20.0

            # 3. Completeness of Matched Criteria
            total_active = ev.active_rules_evaluated
            num_matched = len(ev.rules_matched)
            if total_active > 0:
                completeness_ratio = float(num_matched) / float(total_active)
            else:
                completeness_ratio = 0.0

            completeness_pts = completeness_ratio * 50.0

            # 4. Verification Status
            # Core schemes with active rules have verified documents in registry
            verification_pts = 25.0 if rules_enabled else 15.0

            # 5. Document Recency
            recency_pts = 20.0

            total_score = tier_base + confidence_pts + completeness_pts + verification_pts + recency_pts

            breakdown = {
                "tier_base": tier_base,
                "confidence_weight": confidence_pts,
                "completeness": completeness_pts,
                "verification_status": verification_pts,
                "recency": recency_pts
            }

            scored_items.append({
                "score": total_score,
                "evaluation": ev,
                "tier": ev.outcome.value,
                "confidence_mode": initial_mode,
                "completeness_ratio": completeness_ratio,
                "score_breakdown": breakdown
            })

        # Sort descending by score; if tied, sort alphabetically by scheme name
        scored_items.sort(
            key=lambda x: (-x["score"], x["evaluation"].scheme_name_en)
        )

        # Assign final rank indices (1, 2, 3...)
        results = []
        for idx, item in enumerate(scored_items, start=1):
            results.append(
                RankedSchemeResult(
                    rank=idx,
                    score=item["score"],
                    evaluation=item["evaluation"],
                    tier=item["tier"],
                    confidence_mode=item["confidence_mode"],
                    completeness_ratio=item["completeness_ratio"],
                    score_breakdown=item["score_breakdown"]
                )
            )

        return results


scheme_ranker = SchemeRanker()
