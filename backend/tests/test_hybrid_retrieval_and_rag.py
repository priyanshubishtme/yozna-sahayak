"""Tests for Phase 6: Hybrid Retrieval, Groq RAG Chat, Citation Validation, and Grounded Refusal."""

import uuid
import pytest
from sqlalchemy import select
from backend.app.db.models import (
    Chunk,
    ChunkBox,
    Document,
    DocumentVersion
)
from backend.app.db.session import AsyncSessionLocal
from backend.app.llm.citation_validator import (
    CitationValidationResult,
    citation_validator
)
from backend.app.llm.provider import rag_chat_service
from backend.app.retrieval.hybrid import RetrievedChunk, hybrid_retriever


@pytest.mark.asyncio
async def test_only_verified_document_versions_retrieved():
    """Gate test: Only current verified document versions are retrieved; superseded or unverified chunks are excluded."""
    async with AsyncSessionLocal() as db:
        # Create an unverified/superseded version with distinctive secret chunk text
        unverified_doc = Document(id=f"doc-unver-{uuid.uuid4().hex[:8]}", title="Unapproved Draft Policy", status="pending_review")
        db.add(unverified_doc)

        unverified_ver = DocumentVersion(
            id=f"ver-unver-{uuid.uuid4().hex[:8]}",
            document_id=unverified_doc.id,
            version_number=1,
            binary_sha256="dummy_unver_sha",
            storage_key="data/pdfs/dummy.pdf",
            source_url="https://secret.gov.in/draft.pdf",
            status="superseded_pending_review"  # SUPERSEDED!
        )
        db.add(unverified_ver)

        secret_marker = f"SECRET_UNAPPROVED_MARKER_{uuid.uuid4().hex[:6]}"
        unverified_chunk = Chunk(
            id=f"chk-unver-{uuid.uuid4().hex[:8]}",
            document_version_id=unverified_ver.id,
            page_id="pg-unver-1",
            page_number=1,
            chunk_index=0,
            text=f"This unverified policy contains secret benefit numbers: {secret_marker}",
            token_count=15
        )
        db.add(unverified_chunk)
        await db.commit()

        try:
            # Query explicitly for the unapproved marker
            results = await hybrid_retriever.search(
                db=db,
                query=f"secret benefit numbers {secret_marker}",
                final_k=5
            )

            # GATE: Zero results from unverified/superseded documents
            for r in results:
                assert secret_marker not in r.text
                assert r.document_version_id != unverified_ver.id

        finally:
            await db.delete(unverified_chunk)
            await db.delete(unverified_ver)
            await db.delete(unverified_doc)
            await db.commit()


@pytest.mark.asyncio
async def test_hybrid_retrieval_returns_point_coordinates():
    """Gate test: Chunks returned by hybrid retrieval keep exact page references and bounding boxes."""
    async with AsyncSessionLocal() as db:
        results = await hybrid_retriever.search(
            db=db,
            query="PM-KISAN financial benefit installments Rs 6000",
            scheme_id="SCHEME-PM-KISAN",
            final_k=3
        )

        assert len(results) > 0
        top = results[0]
        assert top.page_number >= 1
        assert top.document_version_id.startswith("ver-")
        assert len(top.boxes) > 0

        # Verify box coordinates
        first_box = top.boxes[0]
        assert "x0" in first_box and "y0" in first_box
        assert first_box["x0"] < first_box["x1"]
        assert first_box["y0"] < first_box["y1"]


@pytest.mark.asyncio
async def test_citation_validator_rejects_hallucinated_citations():
    """Gate test: Citation validator detects and strips invented citation tags (e.g. [C99])."""
    mock_chunks = [
        RetrievedChunk(
            chunk_id="chk-01",
            text="PM-KISAN provides Rs 6,000 annually.",
            page_number=1,
            document_id="doc-01",
            document_title="PM-KISAN Guidelines",
            document_version_id="ver-01",
            scheme_id="SCHEME-PM-KISAN",
            dense_score=0.45,
            sparse_score=1.2,
            rrf_score=0.03,
            boxes=[]
        ),
        RetrievedChunk(
            chunk_id="chk-02",
            text="Paid in three equal installments of Rs 2,000.",
            page_number=1,
            document_id="doc-01",
            document_title="PM-KISAN Guidelines",
            document_version_id="ver-01",
            scheme_id="SCHEME-PM-KISAN",
            dense_score=0.38,
            sparse_score=0.9,
            rrf_score=0.025,
            boxes=[]
        )
    ]

    # Model generated valid [C1] and hallucinated [C99]
    raw_response = "Farmers receive Rs 6,000 yearly [C1]. Ineligible persons are fined Rs 100,000 [C99]."

    val_res = citation_validator.validate(raw_response, mock_chunks, language="en")

    # [C99] must be flagged as invalid tag
    assert "[C99]" in val_res.invalid_tags_found
    # Cleaned text must not contain [C99]
    assert "[C99]" not in val_res.cleaned_text
    # Valid citation [C1] is kept and mapped
    assert len(val_res.citations) == 1
    assert val_res.citations[0].citation_tag == "[C1]"
    assert val_res.citations[0].chunk_id == "chk-01"


@pytest.mark.asyncio
async def test_unsupported_questions_are_refused():
    """Gate test: Questions unsupported by official guidelines receive polite grounded refusal."""
    async with AsyncSessionLocal() as db:
        # Ask completely unsupported question
        result = await rag_chat_service.process_chat(
            db=db,
            query="Can I buy an interplanetary rocket ticket using PM-KISAN subsidy?",
            language="en"
        )

        # Gate: is_refusal must be True, evidence_level must be INSUFFICIENT
        assert result["is_refusal"] is True
        assert result["evidence_level"] == "INSUFFICIENT"
        assert len(result["citations"]) == 0
        assert "insufficient" in result["answer"].lower() or "direct evidence" in result["answer"].lower()


@pytest.mark.asyncio
async def test_grounded_answer_with_strong_evidence():
    """Gate test: Legitimate scheme question produces grounded answer with verified citations."""
    async with AsyncSessionLocal() as db:
        result = await rag_chat_service.process_chat(
            db=db,
            query="What is the financial benefit installment pattern in PM-KISAN?",
            language="en",
            scheme_id="SCHEME-PM-KISAN"
        )

        assert result["is_refusal"] is False
        assert result["evidence_level"] in ["STRONG", "PARTIAL"]
        assert len(result["citations"]) > 0

        # Check citation attributes
        first_cit = result["citations"][0]
        assert first_cit["citation_tag"] in ["[C1]", "[C2]"]
        assert first_cit["page_number"] >= 1
        assert "PM-KISAN" in first_cit["document_title"]
        assert len(first_cit["boxes"]) > 0
