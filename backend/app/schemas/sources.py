"""Schemas for sources, compliance, and discovery configuration."""

from typing import List, Optional
from pydantic import BaseModel, HttpUrl


class SourceItem(BaseModel):
    source_id: str
    name: str
    base_url: str
    source_family: str
    jurisdiction: str
    language_hints: List[str]
    source_role: str
    adapter_key: str
    fetch_mode: str
    allowed_content_types: List[str]
    permission_status: str
    automation_status: str
    notes: Optional[str] = None
    schedule_cron: str
    enabled: bool
    last_success_at: Optional[str] = None
    last_error_at: Optional[str] = None
