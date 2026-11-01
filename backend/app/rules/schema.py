"""Pydantic schemas and validation for eligibility rule trees and evidence provenance.

Enforces Blueprint Section 8.2 & Phase 5 Gate:
- Every condition leaf or rule must have a verified source quote and page number.
- Validates logical condition trees (all / any combinators and deterministic operators).
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, model_validator


class OperatorType(str, Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    GREATER_THAN_OR_EQUAL = "greater_than_or_equal"
    LESS_THAN = "less_than"
    LESS_THAN_OR_EQUAL = "less_than_or_equal"
    BETWEEN_INCLUSIVE = "between_inclusive"
    IN_LIST = "in_list"
    NOT_IN_LIST = "not_in_list"
    IS_TRUE = "is_true"
    IS_FALSE = "is_false"


class RuleSourceRef(BaseModel):
    """Evidence provenance linking a condition to an official document version."""
    document_version_id: str = Field(..., description="Target immutable DocumentVersion ID")
    page_number: int = Field(..., ge=1, description="1-indexed official PDF page number")
    quote: str = Field(..., min_length=5, description="Verbatim quote from the official document")
    chunk_id: Optional[str] = Field(None, description="Optional chunk identifier")


class ConditionLeaf(BaseModel):
    """Individual atomic condition on an applicant profile attribute."""
    field: str = Field(..., min_length=2, description="Profile attribute key (e.g. age, is_farmer)")
    op: OperatorType = Field(..., description="Comparison operator")
    value: Optional[Any] = Field(None, description="Target value for scalar comparisons")
    min: Optional[float] = Field(None, description="Minimum value for between_inclusive")
    max: Optional[float] = Field(None, description="Maximum value for between_inclusive")
    list: Optional[List[Any]] = Field(None, description="Candidate values for in_list")
    official_verification_required: bool = Field(False, description="Whether government verifies externally")
    source: Optional[RuleSourceRef] = Field(None, description="Evidence provenance for this specific leaf")

    @model_validator(mode="after")
    def validate_operator_operands(self):
        if self.op == OperatorType.BETWEEN_INCLUSIVE:
            if self.min is None or self.max is None:
                raise ValueError("between_inclusive operator requires both 'min' and 'max' values")
            if self.min > self.max:
                raise ValueError(f"between_inclusive 'min' ({self.min}) cannot exceed 'max' ({self.max})")
        elif self.op in [OperatorType.IN_LIST, OperatorType.NOT_IN_LIST]:
            if not self.list or len(self.list) == 0:
                raise ValueError(f"{self.op} operator requires non-empty 'list' array")
        elif self.op not in [OperatorType.IS_TRUE, OperatorType.IS_FALSE]:
            if self.value is None:
                raise ValueError(f"Operator {self.op} requires 'value' to be set")
        return self


class ConditionBranch(BaseModel):
    """Compound condition with all (AND) or any (OR) combinator."""
    all: Optional[List[Union[ConditionLeaf, "ConditionBranch"]]] = None
    any: Optional[List[Union[ConditionLeaf, "ConditionBranch"]]] = None

    @model_validator(mode="after")
    def validate_branch(self):
        if self.all is None and self.any is None:
            raise ValueError("Condition branch must define either 'all' or 'any'")
        if self.all is not None and self.any is not None:
            raise ValueError("Condition branch cannot define both 'all' and 'any' at the same level")
        items = self.all if self.all is not None else self.any
        if not items or len(items) == 0:
            raise ValueError("Combinator must have at least one child condition")
        return self


# Resolve forward references for recursive tree
ConditionBranch.model_rebuild()


class RuleTreePayload(BaseModel):
    """Structured rule tree containing condition hierarchy and explicit exceptions."""
    all: Optional[List[Union[ConditionLeaf, ConditionBranch]]] = None
    any: Optional[List[Union[ConditionLeaf, ConditionBranch]]] = None
    exceptions: List[ConditionLeaf] = Field(default_factory=list, description="Disqualifying exceptions")


class RuleCreateRequest(BaseModel):
    """Admin payload to create a new eligibility rule."""
    scheme_id: str = Field(..., description="Target scheme identifier (e.g. SCHEME-PM-KISAN)")
    rule_code: str = Field(..., min_length=3, description="Unique code (e.g. PMKISAN-R01-LAND)")
    rule_json: RuleTreePayload = Field(..., description="Condition tree")
    evidence_quote: str = Field(..., min_length=10, description="Overall verified quote from official document")
    page_reference: int = Field(..., ge=1, description="Official PDF page reference")
    document_version_id: str = Field(..., description="DocumentVersion ID holding the evidence")
    logic_expression: Optional[str] = Field(None, description="Optional human-readable logic formula")


class RuleUpdateRequest(BaseModel):
    """Admin payload to update an existing eligibility rule."""
    rule_json: Optional[RuleTreePayload] = None
    evidence_quote: Optional[str] = None
    page_reference: Optional[int] = None
    document_version_id: Optional[str] = None
    logic_expression: Optional[str] = None


class RuleReviewDecision(BaseModel):
    """Admin action to approve, revise, or retire a rule."""
    decision: str = Field(..., pattern="^(approve|request_changes|retire)$")
    reviewer: str = Field(..., min_length=2, description="Identity of the reviewing administrator")
    notes: Optional[str] = Field(None, description="Justification or change request remarks")
