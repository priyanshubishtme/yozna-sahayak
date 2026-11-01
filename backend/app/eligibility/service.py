"""Eligibility Evaluation Service.

Coordinates loading schemes and rules from database, enforcing strict invalidation gates,
running deterministic three-valued evaluation, and multi-factor ranking.
"""

from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.logging import logger
from backend.app.db.models import EligibilityRule, Scheme
from backend.app.eligibility.evaluator import (
    EligibilityOutcome,
    SchemeEvaluationResult,
    evaluate_scheme
)
from backend.app.eligibility.ranker import RankedSchemeResult, scheme_ranker


class EligibilityService:
    """Manages profile evaluation, rule filtering, and scheme recommendations."""

    async def evaluate_profile(
        self,
        db: AsyncSession,
        profile: Dict[str, Any],
        scheme_id: Optional[str] = None
    ) -> List[RankedSchemeResult]:
        """Evaluates citizen profile against schemes and returns ranked recommendations."""
        # 1. Fetch schemes
        query = select(Scheme)
        if scheme_id:
            query = query.where(Scheme.scheme_id == scheme_id)
        scheme_res = await db.execute(query)
        schemes = scheme_res.scalars().all()
        schemes_by_id = {s.scheme_id: s for s in schemes}

        # 2. Fetch all rules for targeted schemes
        target_ids = list(schemes_by_id.keys())
        rule_query = select(EligibilityRule).where(EligibilityRule.scheme_id.in_(target_ids))
        rule_res = await db.execute(rule_query)
        all_rules = rule_res.scalars().all()

        rules_by_scheme: Dict[str, List[EligibilityRule]] = {sid: [] for sid in target_ids}
        for r in all_rules:
            rules_by_scheme[r.scheme_id].append(r)

        # 3. Evaluate each scheme
        evaluations: List[SchemeEvaluationResult] = []
        for sid, scheme in schemes_by_id.items():
            scheme_rules = rules_by_scheme.get(sid, [])
            eval_res = evaluate_scheme(
                scheme=scheme,
                rules=scheme_rules,
                profile=profile
            )
            evaluations.append(eval_res)

        # 4. Multi-Factor Ranking
        ranked_results = scheme_ranker.rank_schemes(
            evaluations=evaluations,
            schemes_by_id=schemes_by_id
        )

        return ranked_results


eligibility_service = EligibilityService()

