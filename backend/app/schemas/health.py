"""Health and diagnostic status schemas."""

from typing import Dict, Optional
from pydantic import BaseModel, Field


class HealthComponentStatus(BaseModel):
    status: str = Field(..., description="'healthy' or 'degraded'")
    message: Optional[str] = None
    details: Optional[Dict[str, str]] = None


class HealthResponse(BaseModel):
    status: str = Field(..., description="Overall status: 'ok' or 'degraded'")
    app_name: str
    version: str
    environment: str
    timestamp: str
    database_connected: bool
    components: Dict[str, HealthComponentStatus]
