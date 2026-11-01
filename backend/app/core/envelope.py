"""Standard API Response Envelopes per Blueprint V2 Section 12."""

from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class ResponseMeta(BaseModel):
    request_id: str
    timestamp: Optional[str] = None
    pagination: Optional[Dict[str, Any]] = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[List[Any]] = Field(default_factory=list)


class ApiResponse(BaseModel, Generic[DataT]):
    ok: bool = True
    data: Optional[DataT] = None
    meta: ResponseMeta


class ApiErrorResponse(BaseModel):
    ok: bool = False
    error: ErrorDetail
    meta: ResponseMeta


def success_response(data: Any, request_id: str, pagination: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Helper to return uniform success envelope."""
    return {
        "ok": True,
        "data": data,
        "meta": {
            "request_id": request_id,
            "pagination": pagination
        }
    }


def error_response(code: str, message: str, request_id: str, details: Optional[List[Any]] = None) -> Dict[str, Any]:
    """Helper to return uniform error envelope."""
    return {
        "ok": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or []
        },
        "meta": {
            "request_id": request_id
        }
    }
