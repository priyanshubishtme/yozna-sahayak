"""Schemas for scheme discovery, catalogue, and detail endpoints."""

from typing import Optional
from pydantic import BaseModel


class SchemeSummary(BaseModel):
    scheme_id: str
    code: str
    name_en: str
    name_hi: str
    short_name: Optional[str] = None
    level: str
    ministry_or_dept: Optional[str] = None
    category: str
    description_en: str
    description_hi: str
    initial_mode: str
    rule_scope: str
    rag_enabled: bool
    rules_enabled: bool
    benefits_summary_en: Optional[str] = None
    benefits_summary_hi: Optional[str] = None
    official_portal_url: Optional[str] = None


class SchemeDetail(SchemeSummary):
    pass
