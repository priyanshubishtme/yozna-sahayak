"""Three-Valued Deterministic Rule Evaluator and Explainability Engine.

Enforces Blueprint Section 10 & Phase 7 Gate Criteria:
- Pure deterministic evaluation in Python (LLM never decides eligibility).
- Three-valued logic: TRUE, FALSE, UNKNOWN (Kleene logic).
- Disqualification exceptions take strict precedence over qualifying conditions.
- External verification flags ('official_verification_required') shift TRUE to 'Likely Eligible'.
- 4 deterministic scheme outcomes:
    1. Eligible (All rules TRUE, self-attestable/fully verified)
    2. Likely Eligible (All rules TRUE, but requires external official verification)
    3. Need More Information (At least one rule UNKNOWN, zero FALSE)
    4. Not Eligible (At least one rule FALSE or disqualifying exception met)
- Generates structured explainability reasons (matched rules, unmet rules, missing fields).
- Strict Invalidation Gate: Rules with status != 'active' (e.g. 'needs_review') NEVER produce an outcome.
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from backend.app.core.logging import logger
from backend.app.db.models import EligibilityRule, Scheme
from backend.app.rules.schema import ConditionBranch, ConditionLeaf, OperatorType


class ThreeValuedState(str, Enum):
    TRUE = "TRUE"
    FALSE = "FALSE"
    UNKNOWN = "UNKNOWN"


class EligibilityOutcome(str, Enum):
    ELIGIBLE = "Eligible"
    LIKELY_ELIGIBLE = "Likely Eligible"
    NEED_MORE_INFO = "Need More Information"
    NOT_ELIGIBLE = "Not Eligible"


def evaluate_leaf(
    leaf: Union[ConditionLeaf, Dict[str, Any]],
    profile: Dict[str, Any]
) -> Tuple[ThreeValuedState, Optional[str], Optional[str], bool]:
    """Evaluates an atomic condition against a citizen's profile.

    Returns:
        (state, matched_desc, unmet_or_missing_desc, official_verification_required)
    """
    if isinstance(leaf, ConditionLeaf):
        field = leaf.field
        op = leaf.op
        target_val = leaf.value
        min_val = leaf.min
        max_val = leaf.max
        target_list = leaf.list or []
        official_verif = leaf.official_verification_required
    else:
        field = leaf.get("field", "")
        op = leaf.get("op", "equals")
        target_val = leaf.get("value")
        min_val = leaf.get("min")
        max_val = leaf.get("max")
        target_list = leaf.get("list", [])
        official_verif = leaf.get("official_verification_required", False)

    # Check if field exists in citizen profile
    if field not in profile or profile[field] is None:
        return (ThreeValuedState.UNKNOWN, None, field, official_verif)

    actual_val = profile[field]

    # Handle 'not_sure' or 'unknown' profile inputs
    if actual_val in ["not_sure", "unknown", "NOT_SURE", "UNKNOWN"]:
        return (ThreeValuedState.UNKNOWN, None, field, official_verif)

    # Boolean coercion and comparison helper
    def to_bool(val: Any) -> Optional[bool]:
        if isinstance(val, bool):
            return val
        if isinstance(val, str):
            lower = val.strip().lower()
            if lower in ["true", "yes", "1", "y"]:
                return True
            if lower in ["false", "no", "0", "n"]:
                return False
        return None

    # Number coercion helper
    def to_number(val: Any) -> Optional[float]:
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    is_satisfied: bool = False

    try:
        if op in [OperatorType.IS_TRUE, "is_true"]:
            b_val = to_bool(actual_val)
            is_satisfied = (b_val is True)

        elif op in [OperatorType.IS_FALSE, "is_false"]:
            b_val = to_bool(actual_val)
            is_satisfied = (b_val is False)

        elif op in [OperatorType.EQUALS, "equals"]:
            # If target is boolean, compare as booleans
            if isinstance(target_val, bool):
                is_satisfied = (to_bool(actual_val) == target_val)
            elif isinstance(target_val, (int, float)):
                act_num = to_number(actual_val)
                is_satisfied = (act_num is not None and act_num == target_val)
            elif isinstance(actual_val, str) and isinstance(target_val, str):
                is_satisfied = (actual_val.strip().lower() == target_val.strip().lower())
            else:
                is_satisfied = (actual_val == target_val)

        elif op in [OperatorType.NOT_EQUALS, "not_equals"]:
            if isinstance(target_val, bool):
                is_satisfied = (to_bool(actual_val) != target_val)
            elif isinstance(target_val, (int, float)):
                act_num = to_number(actual_val)
                is_satisfied = (act_num is not None and act_num != target_val)
            elif isinstance(actual_val, str) and isinstance(target_val, str):
                is_satisfied = (actual_val.strip().lower() != target_val.strip().lower())
            else:
                is_satisfied = (actual_val != target_val)

        elif op in [OperatorType.GREATER_THAN, "greater_than"]:
            act_num = to_number(actual_val)
            is_satisfied = (act_num is not None and act_num > float(target_val))

        elif op in [OperatorType.GREATER_THAN_OR_EQUAL, "greater_than_or_equal"]:
            act_num = to_number(actual_val)
            is_satisfied = (act_num is not None and act_num >= float(target_val))

        elif op in [OperatorType.LESS_THAN, "less_than"]:
            act_num = to_number(actual_val)
            is_satisfied = (act_num is not None and act_num < float(target_val))

        elif op in [OperatorType.LESS_THAN_OR_EQUAL, "less_than_or_equal"]:
            act_num = to_number(actual_val)
            is_satisfied = (act_num is not None and act_num <= float(target_val))

        elif op in [OperatorType.BETWEEN_INCLUSIVE, "between_inclusive"]:
            act_num = to_number(actual_val)
            if act_num is not None and min_val is not None and max_val is not None:
                is_satisfied = (min_val <= act_num <= max_val)
            else:
                is_satisfied = False

        elif op in [OperatorType.IN_LIST, "in_list"]:
            cand_strings = [str(c).strip().lower() for c in target_list]
            is_satisfied = str(actual_val).strip().lower() in cand_strings

        elif op in [OperatorType.NOT_IN_LIST, "not_in_list"]:
            cand_strings = [str(c).strip().lower() for c in target_list]
            is_satisfied = str(actual_val).strip().lower() not in cand_strings

        else:
            is_satisfied = False

    except Exception as e:
        logger.warning(f"Error evaluating condition leaf {field} {op}: {e}")
        return (ThreeValuedState.UNKNOWN, None, field, official_verif)

    if is_satisfied:
        matched_desc = f"{field} meets criteria ({actual_val})"
        return (ThreeValuedState.TRUE, matched_desc, None, official_verif)
    else:
        unmet_desc = f"{field} did not meet criteria (current value: {actual_val}, required: {op} {target_val if target_val is not None else min_val})"
        return (ThreeValuedState.FALSE, None, unmet_desc, official_verif)


def evaluate_branch(
    node: Union[ConditionBranch, Dict[str, Any]],
    profile: Dict[str, Any]
) -> Tuple[ThreeValuedState, List[str], List[str], List[str], bool]:
    """Recursively evaluates condition branch using Kleene 3-valued logic.

    Returns:
        (state, matched_list, unmet_list, missing_fields, has_official_verif)
    """
    node_dict = node if isinstance(node, dict) else node.model_dump()

    # Base case: if it's an atomic leaf directly
    if "field" in node_dict:
        state, matched, unmet, verif = evaluate_leaf(node_dict, profile)
        return (
            state,
            [matched] if matched else [],
            [unmet] if unmet else [],
            [unmet] if state == ThreeValuedState.UNKNOWN else [],
            verif if state == ThreeValuedState.TRUE else False
        )

    is_all = "all" in node_dict and node_dict["all"] is not None
    children = node_dict.get("all" if is_all else "any", [])

    if not children:
        return (ThreeValuedState.TRUE, [], [], [], False)

    child_results = []
    matched_all: List[str] = []
    unmet_all: List[str] = []
    missing_all: List[str] = []
    any_official_verif = False

    for child in children:
        c_state, c_matched, c_unmet, c_missing, c_verif = evaluate_branch(child, profile)
        child_results.append(c_state)
        matched_all.extend(c_matched)
        unmet_all.extend(c_unmet)
        missing_all.extend(c_missing)
        if c_verif:
            any_official_verif = True

    if is_all:
        # Kleene AND:
        # If ANY child is FALSE -> FALSE
        # Else if ALL children are TRUE -> TRUE
        # Else (contains UNKNOWN and zero FALSE) -> UNKNOWN
        if ThreeValuedState.FALSE in child_results:
            return (ThreeValuedState.FALSE, matched_all, unmet_all, missing_all, any_official_verif)
        elif all(s == ThreeValuedState.TRUE for s in child_results):
            return (ThreeValuedState.TRUE, matched_all, unmet_all, missing_all, any_official_verif)
        else:
            return (ThreeValuedState.UNKNOWN, matched_all, unmet_all, missing_all, any_official_verif)
    else:
        # Kleene OR:
        # If ANY child is TRUE -> TRUE
        # Else if ALL children are FALSE -> FALSE
        # Else -> UNKNOWN
        if ThreeValuedState.TRUE in child_results:
            return (ThreeValuedState.TRUE, matched_all, unmet_all, missing_all, any_official_verif)
        elif all(s == ThreeValuedState.FALSE for s in child_results):
            return (ThreeValuedState.FALSE, matched_all, unmet_all, missing_all, any_official_verif)
        else:
            return (ThreeValuedState.UNKNOWN, matched_all, unmet_all, missing_all, any_official_verif)


class RuleEvaluationResult:
    """Evaluation output for a single EligibilityRule."""

    def __init__(
        self,
        rule_id: str,
        rule_code: str,
        state: ThreeValuedState,
        evidence_quote: str,
        page_reference: int,
        matched_criteria: List[str],
        unmet_criteria: List[str],
        missing_fields: List[str],
        requires_official_verification: bool,
        is_disqualified_by_exception: bool = False
    ):
        self.rule_id = rule_id
        self.rule_code = rule_code
        self.state = state
        self.evidence_quote = evidence_quote
        self.page_reference = page_reference
        self.matched_criteria = matched_criteria
        self.unmet_criteria = unmet_criteria
        self.missing_fields = missing_fields
        self.requires_official_verification = requires_official_verification
        self.is_disqualified_by_exception = is_disqualified_by_exception

    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "rule_code": self.rule_code,
            "state": self.state.value,
            "evidence_quote": self.evidence_quote,
            "page_reference": self.page_reference,
            "matched_criteria": self.matched_criteria,
            "unmet_criteria": self.unmet_criteria,
            "missing_fields": self.missing_fields,
            "requires_official_verification": self.requires_official_verification,
            "is_disqualified_by_exception": self.is_disqualified_by_exception
        }


def evaluate_rule(
    rule: EligibilityRule,
    profile: Dict[str, Any]
) -> RuleEvaluationResult:
    """Evaluates an EligibilityRule enforcing disqualification exception precedence."""
    rule_dict = rule.rule_json or {}
    if isinstance(rule_dict, str):
        try:
            rule_dict = json.loads(rule_dict)
        except Exception:
            rule_dict = {}

    # 1. Evaluate Disqualification Exceptions First
    exceptions = rule_dict.get("exceptions", [])
    for exc in exceptions:
        exc_state, exc_matched, exc_unmet, exc_verif = evaluate_leaf(exc, profile)
        if exc_state == ThreeValuedState.TRUE:
            # Citizen meets disqualifying criteria -> Strictly FALSE!
            field = exc.get("field", "exception")
            reason = f"Disqualified by statutory exclusion: {field} == {profile.get(field)}"
            return RuleEvaluationResult(
                rule_id=rule.id,
                rule_code=rule.rule_code,
                state=ThreeValuedState.FALSE,
                evidence_quote=rule.evidence_quote,
                page_reference=rule.page_reference,
                matched_criteria=[],
                unmet_criteria=[reason],
                missing_fields=[],
                requires_official_verification=False,
                is_disqualified_by_exception=True
            )
        elif exc_state == ThreeValuedState.UNKNOWN:
            # Potential disqualification cannot be confirmed
            field = exc.get("field", "exception")
            return RuleEvaluationResult(
                rule_id=rule.id,
                rule_code=rule.rule_code,
                state=ThreeValuedState.UNKNOWN,
                evidence_quote=rule.evidence_quote,
                page_reference=rule.page_reference,
                matched_criteria=[],
                unmet_criteria=[],
                missing_fields=[field],
                requires_official_verification=False,
                is_disqualified_by_exception=False
            )

    # 2. Evaluate Main Qualifying Condition Hierarchy
    main_node = {}
    if "all" in rule_dict:
        main_node["all"] = rule_dict["all"]
    elif "any" in rule_dict:
        main_node["any"] = rule_dict["any"]
    elif "field" in rule_dict:
        main_node = rule_dict

    state, matched, unmet, missing, verif = evaluate_branch(main_node, profile)

    return RuleEvaluationResult(
        rule_id=rule.id,
        rule_code=rule.rule_code,
        state=state,
        evidence_quote=rule.evidence_quote,
        page_reference=rule.page_reference,
        matched_criteria=matched,
        unmet_criteria=unmet,
        missing_fields=list(set(missing)),
        requires_official_verification=verif
    )


class SchemeEvaluationResult:
    """Aggregate deterministic evaluation outcome for a scheme."""

    def __init__(
        self,
        scheme_id: str,
        scheme_name_en: str,
        scheme_name_hi: str,
        outcome: EligibilityOutcome,
        active_rules_evaluated: int,
        rules_matched: List[Dict[str, Any]],
        rules_unmet: List[Dict[str, Any]],
        missing_fields: List[str],
        ignored_unverified_rules: List[str],
        reasons_en: List[str],
        reasons_hi: List[str],
        requires_official_verification: bool
    ):
        self.scheme_id = scheme_id
        self.scheme_name_en = scheme_name_en
        self.scheme_name_hi = scheme_name_hi
        self.outcome = outcome
        self.active_rules_evaluated = active_rules_evaluated
        self.rules_matched = rules_matched
        self.rules_unmet = rules_unmet
        self.missing_fields = missing_fields
        self.ignored_unverified_rules = ignored_unverified_rules
        self.reasons_en = reasons_en
        self.reasons_hi = reasons_hi
        self.requires_official_verification = requires_official_verification

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scheme_id": self.scheme_id,
            "scheme_name_en": self.scheme_name_en,
            "scheme_name_hi": self.scheme_name_hi,
            "outcome": self.outcome.value,
            "active_rules_evaluated": self.active_rules_evaluated,
            "rules_matched": self.rules_matched,
            "rules_unmet": self.rules_unmet,
            "missing_fields": self.missing_fields,
            "ignored_unverified_rules": self.ignored_unverified_rules,
            "reasons_en": self.reasons_en,
            "reasons_hi": self.reasons_hi,
            "requires_official_verification": self.requires_official_verification
        }


def evaluate_scheme(
    scheme: Scheme,
    rules: List[EligibilityRule],
    profile: Dict[str, Any]
) -> SchemeEvaluationResult:
    """Evaluates all rules for a scheme enforcing strict invalidation gates and 4 deterministic outcomes."""
    # Strict Invalidation Gate (Phase 7 Gate Criterion 2):
    # Only rules with status == 'active' can produce an outcome.
    active_rules: List[EligibilityRule] = []
    ignored_unverified: List[str] = []

    for r in rules:
        if r.status == "active":
            active_rules.append(r)
        else:
            ignored_unverified.append(f"{r.rule_code} ({r.status})")

    rules_matched: List[Dict[str, Any]] = []
    rules_unmet: List[Dict[str, Any]] = []
    missing_fields_set: Set[str] = set()
    requires_official_verif: bool = False

    reasons_en: List[str] = []
    reasons_hi: List[str] = []

    # If scheme has zero active rules (e.g. pure rag_only or all rules in needs_review):
    if not active_rules:
        outcome = EligibilityOutcome.NEED_MORE_INFO
        reasons_en.append("No active verified rules available in registry; formal determination pending official review.")
        reasons_hi.append("रजिस्ट्री में कोई सत्यापित नियम सक्रिय नहीं है; अंतिम पात्रता आधिकारिक समीक्षा के अधीन है।")
        return SchemeEvaluationResult(
            scheme_id=scheme.scheme_id,
            scheme_name_en=scheme.name_en,
            scheme_name_hi=scheme.name_hi,
            outcome=outcome,
            active_rules_evaluated=0,
            rules_matched=[],
            rules_unmet=[],
            missing_fields=[],
            ignored_unverified_rules=ignored_unverified,
            reasons_en=reasons_en,
            reasons_hi=reasons_hi,
            requires_official_verification=False
        )

    any_false = False
    any_unknown = False

    for r in active_rules:
        res = evaluate_rule(r, profile)
        if res.state == ThreeValuedState.TRUE:
            rules_matched.append(res.to_dict())
            if res.requires_official_verification:
                requires_official_verif = True
        elif res.state == ThreeValuedState.FALSE:
            any_false = True
            rules_unmet.append(res.to_dict())
        elif res.state == ThreeValuedState.UNKNOWN:
            any_unknown = True
            missing_fields_set.update(res.missing_fields)

    # 4 Deterministic Scheme Outcomes
    if any_false:
        outcome = EligibilityOutcome.NOT_ELIGIBLE
        for u in rules_unmet:
            for crit in u["unmet_criteria"]:
                reasons_en.append(f"Unmet criterion: {crit} (Source: {u['rule_code']} p.{u['page_reference']})")
                reasons_hi.append(f"अपात्रता शर्त: {crit} (स्रोत: {u['rule_code']} पृष्ठ {u['page_reference']})")
    elif any_unknown:
        outcome = EligibilityOutcome.NEED_MORE_INFO
        fields_str = ", ".join(sorted(missing_fields_set))
        reasons_en.append(f"Missing required profile information: {fields_str}")
        reasons_hi.append(f"पात्रता निर्धारण हेतु अतिरिक्त जानकारी आवश्यक है: {fields_str}")
    else:
        # All active rules are TRUE
        if requires_official_verif:
            outcome = EligibilityOutcome.LIKELY_ELIGIBLE
            reasons_en.append("Self-reported profile satisfies criteria; subject to official departmental record verification.")
            reasons_hi.append("नागरिक विवरण सभी पात्रता शर्तों को पूरा करता है; आधिकारिक अभिलेख सत्यापन के अधीन।")
        else:
            outcome = EligibilityOutcome.ELIGIBLE
            reasons_en.append("Applicant satisfies all verified statutory eligibility requirements.")
            reasons_hi.append("आवेदक सभी आधिकारिक एवं सत्यापित पात्रता शर्तों को पूर्णतः संतुष्ट करता है।")

    return SchemeEvaluationResult(
        scheme_id=scheme.scheme_id,
        scheme_name_en=scheme.name_en,
        scheme_name_hi=scheme.name_hi,
        outcome=outcome,
        active_rules_evaluated=len(active_rules),
        rules_matched=rules_matched,
        rules_unmet=rules_unmet,
        missing_fields=sorted(list(missing_fields_set)),
        ignored_unverified_rules=ignored_unverified,
        reasons_en=reasons_en,
        reasons_hi=reasons_hi,
        requires_official_verification=requires_official_verif
    )
