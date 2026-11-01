"""Grounded RAG Chat and Citation Validation API.

Enforces Blueprint Section 9.1 - 9.7:
- Bilingual Hindi/English grounded question answering.
- Strict citation validation: zero invented citations.
- Deterministic evidence quality grading (STRONG | PARTIAL | INSUFFICIENT).
- SSE streaming and standard JSON responses.
"""

import asyncio
import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.envelope import success_response
from backend.app.db.session import get_db
from backend.app.llm.provider import rag_chat_service
from backend.app.retrieval.hybrid import hybrid_retriever

router = APIRouter(prefix="/chat", tags=["RAG Chat & Question Answering"])


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Citizen inquiry in Hindi or English")
    language: str = Field("hi", pattern="^(hi|en)$", description="Preferred response language")
    scheme_id: Optional[str] = Field(None, description="Optional scheme_id filter")
    session_id: Optional[str] = Field(None, description="Client conversation session identifier")


class RetrievalTestRequest(BaseModel):
    query: str = Field(..., min_length=2)
    scheme_id: Optional[str] = None
    dense_k: int = Field(20, ge=1, le=50)
    sparse_k: int = Field(20, ge=1, le=50)
    final_k: int = Field(5, ge=1, le=20)


@router.post("")
async def chat_message(
    payload: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Processes citizen question through the grounded hybrid RAG pipeline."""
    request_id = getattr(request.state, "request_id", "direct")
    result = await rag_chat_service.process_chat(
        db=db,
        query=payload.query,
        language=payload.language,
        scheme_id=payload.scheme_id
    )
    return success_response(data=result, request_id=request_id)


@router.post("/stream")
async def chat_stream(
    payload: ChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Server-Sent Events (SSE) streaming chat endpoint with progressive status and validated final payload."""
    async def event_generator():
        yield f"event: status\ndata: {json.dumps({'stage': 'retrieving', 'message': 'Searching verified official guidelines...'})}\n\n"
        await asyncio.sleep(0.05)

        yield f"event: status\ndata: {json.dumps({'stage': 'generating', 'message': 'Synthesizing evidence-grounded answer...'})}\n\n"
        await asyncio.sleep(0.05)

        result = await rag_chat_service.process_chat(
            db=db,
            query=payload.query,
            language=payload.language,
            scheme_id=payload.scheme_id
        )

        yield f"event: status\ndata: {json.dumps({'stage': 'validating', 'message': 'Validating citations and page bounding boxes...'})}\n\n"
        await asyncio.sleep(0.05)

        yield f"event: final\ndata: {json.dumps(result)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/retrieval/test")
async def test_hybrid_retrieval(
    payload: RetrievalTestRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Diagnostic tool to inspect top-k hybrid candidates, dense/sparse scores, and RRF ranks."""
    request_id = getattr(request.state, "request_id", "direct")
    chunks = await hybrid_retriever.search(
        db=db,
        query=payload.query,
        scheme_id=payload.scheme_id,
        dense_k=payload.dense_k,
        sparse_k=payload.sparse_k,
        final_k=payload.final_k
    )
    return success_response(
        data={
            "query": payload.query,
            "scheme_id": payload.scheme_id,
            "retrieved_count": len(chunks),
            "candidates": [c.to_dict() for c in chunks]
        },
        request_id=request_id
    )
