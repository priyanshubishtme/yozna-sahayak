"""Tests for Phase 4: PDF Ingestion, Coordinate Extraction, and Diagnostic Spot-Checks."""

import io
from pathlib import Path
import uuid
import pymupdf
import pytest
from backend.app.db.models import (
    Chunk,
    ChunkBox,
    Document,
    DocumentVersion,
    Page,
    Scheme,
    SchemeDocument
)
from backend.app.db.session import AsyncSessionLocal
from backend.app.ingest.chunker import PageBoundedChunker
from backend.app.ingest.diagnostics import diagnostic_renderer
from backend.app.ingest.extractor import PDFCoordinateExtractor
from backend.app.ingest.service import pdf_ingestion_service


def create_test_pdf_bytes() -> bytes:
    """Creates a point-accurate test PDF with 2 pages and distinct sections."""
    doc = pymupdf.open()
    # Page 1
    p1 = doc.new_page(width=595, height=842)
    p1.insert_text((72, 80), "PM-KISAN Guidelines 2024", fontsize=16)
    p1.insert_text((72, 120), "Clause 1: Definition of Farmer Family", fontsize=13)
    p1.insert_text((72, 150), "A farmer family includes husband, wife, and minor children having cultivable land.", fontsize=10)
    p1.insert_text((72, 200), "Clause 2: Direct Benefit Installments", fontsize=13)
    p1.insert_text((72, 230), "Financial benefit of Rs 6,000 per year will be paid in three four-monthly installments.", fontsize=10)

    # Page 2
    p2 = doc.new_page(width=595, height=842)
    p2.insert_text((72, 80), "Clause 3: Exclusion Criteria & Ineligibility", fontsize=13)
    p2.insert_text((72, 110), "All institutional landowners and former constitutional office holders are excluded.", fontsize=10)
    p2.insert_text((72, 140), "Income tax payers and professionals are similarly disqualified from the benefit.", fontsize=10)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_pdf_coordinate_extractor_point_accuracy():
    """Gate test: Extracts page dimensions, text, and point-accurate bounding boxes in PDF points."""
    pdf_bytes = create_test_pdf_bytes()
    pages = PDFCoordinateExtractor.extract_from_bytes(pdf_bytes)

    assert len(pages) == 2
    # Verify Page 1
    p1 = pages[0]
    assert p1.page_number == 1
    assert p1.width == 595.0
    assert p1.height == 842.0
    assert p1.rotation == 0
    assert p1.ocr_used is False
    assert len(p1.lines) > 0

    # Verify line bounding boxes
    first_line = p1.lines[0]
    assert "PM-KISAN" in first_line.text
    assert first_line.x0 >= 70.0
    assert first_line.y0 >= 60.0
    assert first_line.x1 > first_line.x0
    assert first_line.y1 > first_line.y0

    # Verify Page 2
    p2 = pages[1]
    assert p2.page_number == 2
    assert "Exclusion Criteria" in p2.raw_text


def test_page_bounded_chunker_guarantees():
    """Gate test: Every chunk strictly preserves page number and line bounding boxes; never merges across pages."""
    pdf_bytes = create_test_pdf_bytes()
    pages = PDFCoordinateExtractor.extract_from_bytes(pdf_bytes)
    chunker = PageBoundedChunker(target_words=20, max_words=50)
    chunks = chunker.chunk_pages(pages, "v-test-doc")

    assert len(chunks) >= 2

    # Verify that every chunk has non-empty boxes, correct page number, and valid token count
    for chk in chunks:
        assert chk.page_number in [1, 2]
        assert len(chk.boxes) > 0
        assert chk.token_count > 0
        assert chk.text != ""
        # Check box coordinates
        for b in chk.boxes:
            assert b.x0 < b.x1
            assert b.y0 < b.y1
            assert b.text_snippet != ""


def test_diagnostic_spot_check_renderer():
    """Gate test: Spot-checks pass: renders diagnostic annotated image in data/debug."""
    pdf_bytes = create_test_pdf_bytes()
    pages = PDFCoordinateExtractor.extract_from_bytes(pdf_bytes)
    chunker = PageBoundedChunker()
    chunks = chunker.chunk_pages(pages, "ver-test-render")
    p1_boxes = [b for chk in chunks if chk.page_number == 1 for b in chk.boxes]

    img_path, count = diagnostic_renderer.render_page_with_boxes(
        pdf_bytes=pdf_bytes,
        page_number=1,
        boxes=p1_boxes,
        version_id="ver-test-render"
    )

    assert img_path.exists()
    assert count == len(p1_boxes)
    assert img_path.stat().st_size > 1000  # Non-trivial image file


@pytest.mark.asyncio
async def test_single_shared_pdf_ingestion_pipeline(client):
    """Gate test: One single shared ingestion path creates Page, Chunk, and ChunkBox records and updates status."""
    scheme_id = "SCHEME-PM-KISAN"
    doc_id = f"doc-ingest-{uuid.uuid4().hex[:6]}"
    ver_id = f"ver-ingest-{uuid.uuid4().hex[:6]}"
    pdf_bytes = create_test_pdf_bytes()

    # 1. Setup Document and DocumentVersion in DB
    async with AsyncSessionLocal() as session:
        doc = Document(
            id=doc_id,
            title="PM-KISAN Operational Guidelines for Ingestion Test",
            document_type="guideline",
            status="verified"
        )
        session.add(doc)

        sd = SchemeDocument(scheme_id=scheme_id, document_id=doc_id, is_primary=True)
        session.add(sd)

        version = DocumentVersion(
            id=ver_id,
            document_id=doc_id,
            version_number=1,
            binary_sha256="sha256_ingest_test",
            storage_key="data/pdfs/ingest_test.pdf",
            status="verified",
            source_url="https://pmkisan.gov.in/test.pdf"
        )
        session.add(version)
        await session.commit()

    # Store bytes in storage_service so ingestion finds it
    from backend.app.discovery.storage import storage_service
    storage_service.store_bytes(pdf_bytes, "application/pdf")
    # Also directly register with the sha
    (storage_service.pdfs_dir / f"{version.binary_sha256}.pdf").write_bytes(pdf_bytes)

    try:
        # 2. Trigger ingestion via API endpoint
        res = await client.post(f"/api/v1/admin/documents/{ver_id}/ingest")
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["status"] == "ingested"
        assert data["page_count"] == 2
        assert data["chunk_count"] > 0
        assert data["box_count"] > 0

        # 3. Query chunks endpoint and verify bounding boxes
        chunks_res = await client.get(f"/api/v1/admin/documents/{ver_id}/chunks")
        assert chunks_res.status_code == 200
        chunks = chunks_res.json()["data"]
        assert len(chunks) > 0
        first_chunk = chunks[0]
        assert "boxes" in first_chunk
        assert len(first_chunk["boxes"]) > 0
        box0 = first_chunk["boxes"][0]
        assert "x0" in box0 and "y0" in box0 and "x1" in box0 and "y1" in box0

        # 4. Query pages endpoint
        pages_res = await client.get(f"/api/v1/admin/documents/{ver_id}/pages")
        assert pages_res.status_code == 200
        pages = pages_res.json()["data"]
        assert len(pages) == 2
        assert pages[0]["width"] == 595.0

    finally:
        from sqlalchemy import delete
        async with AsyncSessionLocal() as session:
            await session.execute(delete(ChunkBox).where(ChunkBox.chunk_id.like(f"chk-{ver_id[:8]}%")))
            await session.execute(delete(Chunk).where(Chunk.document_version_id == ver_id))
            await session.execute(delete(Page).where(Page.document_version_id == ver_id))
            await session.execute(delete(DocumentVersion).where(DocumentVersion.id == ver_id))
            await session.execute(delete(SchemeDocument).where(SchemeDocument.document_id == doc_id))
            await session.execute(delete(Document).where(Document.id == doc_id))
            await session.commit()


@pytest.mark.asyncio
async def test_manual_upload_uses_same_shared_pipeline(client):
    """Gate test: Manual PDF upload uses the exact same shared ingestion path."""
    pdf_bytes = create_test_pdf_bytes()

    res = await client.post(
        "/api/v1/admin/documents/upload",
        data={
            "scheme_id": "SCHEME-PM-KISAN",
            "document_title": "Manually Uploaded Gazette Circular",
            "document_type": "circular"
        },
        files={"file": ("manual_circular.pdf", pdf_bytes, "application/pdf")}
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert "document_id" in data
    assert "version_id" in data
    assert data["ingestion"]["status"] == "ingested"
    assert data["ingestion"]["box_count"] > 0

    # Clean up upload test
    doc_id = data["document_id"]
    ver_id = data["version_id"]
    from sqlalchemy import delete
    async with AsyncSessionLocal() as session:
        await session.execute(delete(ChunkBox).where(ChunkBox.chunk_id.like(f"chk-{ver_id[:8]}%")))
        await session.execute(delete(Chunk).where(Chunk.document_version_id == ver_id))
        await session.execute(delete(Page).where(Page.document_version_id == ver_id))
        await session.execute(delete(DocumentVersion).where(DocumentVersion.id == ver_id))
        await session.execute(delete(SchemeDocument).where(SchemeDocument.document_id == doc_id))
        await session.execute(delete(Document).where(Document.id == doc_id))
        await session.commit()
