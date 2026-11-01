"""Service layer for eligibility rule management, dependency tracking, and invalidation lifecycle.

Enforces Blueprint Section 8.1 - 8.4 & Phase 5 Gate:
- Every active rule has verified quote, page reference, and valid document dependency.
- Changed or superseded source versions automatically mark dependent rules as 'needs_review'.
- Human review is strictly required before rules can be re-enabled.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import uuid
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.errors import AppException
from backend.app.core.logging import logger
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
from backend.app.rules.schema import (
    ConditionBranch,
    ConditionLeaf,
    RuleCreateRequest,
    RuleReviewDecision,
    RuleTreePayload,
    RuleUpdateRequest
)


class RuleService:
    """Manages the authoring, verification, invalidation, and provenance of eligibility rules."""

    @staticmethod
    def generate_logic_expression(rule_json: Dict[str, Any]) -> str:
        """Converts condition tree dictionary into human-readable Boolean logic formula."""
        def format_leaf(leaf: Dict[str, Any]) -> str:
            field = leaf.get("field", "")
            op = leaf.get("op", "equals")
            val = leaf.get("value")
            if op == "equals":
                return f"({field} == {val})"
            elif op == "not_equals":
                return f"({field} != {val})"
            elif op == "greater_than_or_equal":
                return f"({field} >= {val})"
            elif op == "less_than_or_equal":
                return f"({field} <= {val})"
            elif op == "greater_than":
                return f"({field} > {val})"
            elif op == "less_than":
                return f"({field} < {val})"
            elif op == "between_inclusive":
                return f"({leaf.get('min')} <= {field} <= {leaf.get('max')})"
            elif op == "in_list":
                return f"({field} IN {leaf.get('list', [])})"
            elif op == "is_true":
                return f"({field} == True)"
            elif op == "is_false":
                return f"({field} == False)"
            return f"({field} {op} {val})"

        def format_branch(node: Dict[str, Any]) -> str:
            if "all" in node and node["all"]:
                parts = [format_branch(child) if isinstance(child, dict) and ("all" in child or "any" in child) else format_leaf(child) for child in node["all"]]
                return " AND ".join(parts)
            elif "any" in node and node["any"]:
                parts = [format_branch(child) if isinstance(child, dict) and ("all" in child or "any" in child) else format_leaf(child) for child in node["any"]]
                return "(" + " OR ".join(parts) + ")"
            elif "field" in node:
                return format_leaf(node)
            return "TRUE"

        main_expr = format_branch(rule_json)
        exceptions = rule_json.get("exceptions", [])
        if exceptions:
            exc_parts = [format_leaf(exc) for exc in exceptions]
            exc_str = " OR ".join(exc_parts)
            return f"{main_expr} AND NOT ({exc_str})"
        return main_expr

    async def create_rule(
        self,
        db: AsyncSession,
        payload: RuleCreateRequest,
        actor: str = "admin"
    ) -> EligibilityRule:
        """Creates a new rule in pending_review status with evidence dependencies."""
        # 1. Verify scheme exists
        scheme_res = await db.execute(select(Scheme).where(Scheme.scheme_id == payload.scheme_id))
        scheme = scheme_res.scalar_one_or_none()
        if not scheme:
            raise AppException(code="SCHEME_NOT_FOUND", message=f"Scheme '{payload.scheme_id}' does not exist", status_code=404)

        # 2. Verify target document version exists
        ver_res = await db.execute(select(DocumentVersion).where(DocumentVersion.id == payload.document_version_id))
        version = ver_res.scalar_one_or_none()
        if not version:
            raise AppException(code="VERSION_NOT_FOUND", message=f"Document version '{payload.document_version_id}' does not exist", status_code=404)

        # 3. Check rule code uniqueness
        code_res = await db.execute(
            select(EligibilityRule).where(
                EligibilityRule.scheme_id == payload.scheme_id,
                EligibilityRule.rule_code == payload.rule_code
            )
        )
        if code_res.scalar_one_or_none():
            raise AppException(code="RULE_CODE_EXISTS", message=f"Rule code '{payload.rule_code}' already exists for scheme '{payload.scheme_id}'", status_code=409)

        # 4. Generate logic expression if not supplied
        rule_dict = payload.rule_json.model_dump()
        logic_expr = payload.logic_expression or self.generate_logic_expression(rule_dict)

        rule_id = f"rule-{uuid.uuid4().hex[:12]}"
        rule = EligibilityRule(
            id=rule_id,
            scheme_id=payload.scheme_id,
            rule_code=payload.rule_code,
            version=1,
            rule_json=rule_dict,
            logic_expression=logic_expr,
            status="pending_review",
            evidence_quote=payload.evidence_quote,
            page_reference=payload.page_reference
        )
        db.add(rule)
        await db.flush()

        # 5. Record dependency edge
        dependency = RuleDocumentDependency(
            rule_id=rule.id,
            document_version_id=payload.document_version_id,
            page_number=payload.page_reference
        )
        db.add(dependency)

        # 6. Audit event
        audit = AuditEvent(
            id=f"aud-{uuid.uuid4().hex[:12]}",
            actor=actor,
            action="eligibility_rule_created",
            resource_type="eligibility_rule",
            resource_id=rule.id,
            details_json={
                "scheme_id": payload.scheme_id,
                "rule_code": payload.rule_code,
                "document_version_id": payload.document_version_id,
                "page": payload.page_reference
            }
        )
        db.add(audit)
        await db.commit()
        await db.refresh(rule)

        logger.info(f"Created eligibility rule {rule.id} ({rule.rule_code}) for scheme {payload.scheme_id}")
        return rule

    async def review_rule(
        self,
        db: AsyncSession,
        rule_id: str,
        review_data: RuleReviewDecision
    ) -> EligibilityRule:
        """Enforces human review gate: approves, requests changes, or retires an eligibility rule."""
        res = await db.execute(select(EligibilityRule).where(EligibilityRule.id == rule_id))
        rule = res.scalar_one_or_none()
        if not rule:
            raise AppException(code="RULE_NOT_FOUND", message=f"Rule '{rule_id}' not found", status_code=404)

        scheme_res = await db.execute(select(Scheme).where(Scheme.scheme_id == rule.scheme_id))
        scheme = scheme_res.scalar_one_or_none()

        if review_data.decision == "approve":
            # GATE CHECK 1: Rule must have non-empty quote and page reference
            if not rule.evidence_quote or len(rule.evidence_quote.strip()) < 5:
                raise AppException(
                    code="RULE_EVIDENCE_MISSING",
                    message="Cannot approve rule without a verified verbatim evidence quote from official document",
                    status_code=400
                )
            if not rule.page_reference or rule.page_reference < 1:
                raise AppException(
                    code="RULE_PAGE_MISSING",
                    message="Cannot approve rule without a valid official PDF page reference",
                    status_code=400
                )

            # GATE CHECK 2: Rule dependencies must point to active verified/ingested document versions
            dep_res = await db.execute(select(RuleDocumentDependency).where(RuleDocumentDependency.rule_id == rule.id))
            deps = dep_res.scalars().all()
            if not deps:
                raise AppException(
                    code="RULE_DEPENDENCY_MISSING",
                    message="Cannot approve rule: no official document version dependency linked",
                    status_code=400
                )

            for dep in deps:
                v_res = await db.execute(select(DocumentVersion).where(DocumentVersion.id == dep.document_version_id))
                ver = v_res.scalar_one_or_none()
                if not ver or ver.status in ["outdated", "rejected", "superseded_pending_review"]:
                    raise AppException(
                        code="RULE_DEPENDENCY_OUTDATED",
                        message=f"Cannot approve rule: dependent version '{dep.document_version_id}' is {ver.status if ver else 'missing'}. Re-link to current verified version.",
                        status_code=400
                    )

            rule.status = "active"
            if scheme:
                scheme.rules_enabled = True

        elif review_data.decision == "request_changes":
            rule.status = "needs_review"
            await self._recompute_scheme_rules_enabled(db, rule.scheme_id)

        elif review_data.decision == "retire":
            rule.status = "retired"
            await self._recompute_scheme_rules_enabled(db, rule.scheme_id)

        # Record review audit
        review_record = RuleReview(
            id=f"rr-{uuid.uuid4().hex[:12]}",
            rule_id=rule.id,
            reviewer=review_data.reviewer,
            decision=review_data.decision,
            notes=review_data.notes
        )
        db.add(review_record)

        # Audit event
        audit = AuditEvent(
            id=f"aud-{uuid.uuid4().hex[:12]}",
            actor=review_data.reviewer,
            action=f"rule_{review_data.decision}",
            resource_type="eligibility_rule",
            resource_id=rule.id,
            details_json={
                "previous_status": rule.status,
                "new_status": rule.status,
                "decision": review_data.decision,
                "notes": review_data.notes
            }
        )
        db.add(audit)
        await db.commit()
        await db.refresh(rule)

        logger.info(f"Rule {rule.id} ({rule.rule_code}) review complete: decision='{review_data.decision}' -> status='{rule.status}'")
        return rule

    async def invalidate_dependent_rules(
        self,
        db: AsyncSession,
        document_version_id: str,
        reason: str = "source_document_superseded"
    ) -> List[str]:
        """Blueprint Section 8.4: When a document version changes, marks all dependent active rules as needs_review."""
        dep_res = await db.execute(
            select(RuleDocumentDependency).where(RuleDocumentDependency.document_version_id == document_version_id)
        )
        deps = dep_res.scalars().all()
        invalidated_rule_ids = []

        affected_scheme_ids = set()
        for dep in deps:
            r_res = await db.execute(select(EligibilityRule).where(EligibilityRule.id == dep.rule_id))
            rule = r_res.scalar_one_or_none()
            if rule and rule.status == "active":
                rule.status = "needs_review"
                invalidated_rule_ids.append(rule.id)
                affected_scheme_ids.add(rule.scheme_id)

                # Record review audit explaining auto-invalidation
                review_record = RuleReview(
                    id=f"rr-{uuid.uuid4().hex[:12]}",
                    rule_id=rule.id,
                    reviewer="system_invalidation_hook",
                    decision="request_changes",
                    notes=f"Automatically marked needs_review because dependent source version '{document_version_id}' changed ({reason})."
                )
                db.add(review_record)

        # Recompute rules_enabled flag for all affected schemes
        for s_id in affected_scheme_ids:
            await self._recompute_scheme_rules_enabled(db, s_id)

        await db.commit()
        logger.info(f"Invalidated {len(invalidated_rule_ids)} rules dependent on document version {document_version_id}")
        return invalidated_rule_ids

    async def _recompute_scheme_rules_enabled(self, db: AsyncSession, scheme_id: str) -> None:
        """Disables rules_enabled on a scheme if it no longer has any active rules."""
        active_res = await db.execute(
            select(EligibilityRule).where(
                EligibilityRule.scheme_id == scheme_id,
                EligibilityRule.status == "active"
            )
        )
        active_rules = active_res.scalars().all()
        scheme_res = await db.execute(select(Scheme).where(Scheme.scheme_id == scheme_id))
        scheme = scheme_res.scalar_one_or_none()
        if scheme:
            scheme.rules_enabled = len(active_rules) > 0


rule_service = RuleService()
