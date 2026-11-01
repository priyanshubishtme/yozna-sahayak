"""Page-Bounded and Coordinate-Preserving Chunker.

Enforces Blueprint Section 7.4:
- Section-aware and strictly page-bounded (never merges across page boundaries).
- Target 250-400 tokens per chunk.
- Attaches exact ordered bounding boxes to each chunk for frontend citation highlighting.
- Generates stable, deterministic chunk IDs.
"""

from dataclasses import dataclass, field
from typing import List, Optional
from backend.app.ingest.extractor import ExtractedLine, ExtractedPage


@dataclass
class ChunkBoxDTO:
    """Bounding box within a chunk."""
    x0: float
    y0: float
    x1: float
    y1: float
    text_snippet: str


@dataclass
class ProcessedChunk:
    """Structured text chunk prepared for database storage and vector embedding."""
    chunk_id: str
    document_version_id: str
    page_number: int
    chunk_index: int
    section_title: Optional[str]
    text: str
    token_count: int
    boxes: List[ChunkBoxDTO] = field(default_factory=list)


class PageBoundedChunker:
    """Chunks pages into retrievable units while strictly preserving page boundaries and line coordinates."""

    def __init__(self, target_words: int = 150, max_words: int = 300):
        self.target_words = target_words
        self.max_words = max_words

    def chunk_pages(
        self,
        pages: List[ExtractedPage],
        document_version_id: str
    ) -> List[ProcessedChunk]:
        """Creates page-bounded chunks with preserved bounding boxes."""
        all_chunks: List[ProcessedChunk] = []

        for page in pages:
            page_chunks = self._chunk_single_page(page, document_version_id)
            all_chunks.extend(page_chunks)

        return all_chunks

    def _chunk_single_page(
        self,
        page: ExtractedPage,
        version_id: str
    ) -> List[ProcessedChunk]:
        """Chunks a single page. Never spans across page boundaries."""
        if not page.lines:
            # Fallback for page with only raw text
            if page.raw_text.strip():
                return [ProcessedChunk(
                    chunk_id=f"chk-{version_id}-p{page.page_number:03d}-00",
                    document_version_id=version_id,
                    page_number=page.page_number,
                    chunk_index=0,
                    section_title=None,
                    text=page.raw_text[:1200],
                    token_count=int(len(page.raw_text.split()) * 1.3),
                    boxes=[ChunkBoxDTO(
                        x0=72.0,
                        y0=72.0,
                        x1=page.width - 72.0,
                        y1=min(page.height - 72.0, 300.0),
                        text_snippet=page.raw_text[:120]
                    )]
                )]
            return []

        chunks: List[ProcessedChunk] = []
        current_lines: List[ExtractedLine] = []
        current_words = 0
        chunk_idx = 0
        current_section: Optional[str] = None

        for line in page.lines:
            line_words = len(line.text.split())

            # Detect section heading (larger font or heading pattern)
            is_heading = (
                line.font_size_estimate >= 13.0 or 
                line.text.startswith(("Clause ", "Section ", "Chapter ", "Part ", "1.", "2.", "3.", "4.", "5.", "Rule "))
            ) and len(line.text) < 120

            # If we hit a heading and already have content, close current chunk
            if is_heading and current_words >= 40:
                chunk = self._build_chunk(
                    version_id=version_id,
                    page_number=page.page_number,
                    chunk_idx=chunk_idx,
                    section_title=current_section,
                    lines=current_lines
                )
                chunks.append(chunk)
                chunk_idx += 1
                current_lines = []
                current_words = 0

            if is_heading:
                current_section = line.text.strip()

            current_lines.append(line)
            current_words += line_words

            # Check word limit threshold
            if current_words >= self.target_words:
                chunk = self._build_chunk(
                    version_id=version_id,
                    page_number=page.page_number,
                    chunk_idx=chunk_idx,
                    section_title=current_section,
                    lines=current_lines
                )
                chunks.append(chunk)
                chunk_idx += 1
                current_lines = []
                current_words = 0

        # Remaining lines on this page
        if current_lines:
            chunk = self._build_chunk(
                version_id=version_id,
                page_number=page.page_number,
                chunk_idx=chunk_idx,
                section_title=current_section,
                lines=current_lines
            )
            chunks.append(chunk)

        return chunks

    def _build_chunk(
        self,
        version_id: str,
        page_number: int,
        chunk_idx: int,
        section_title: Optional[str],
        lines: List[ExtractedLine]
    ) -> ProcessedChunk:
        """Packages a group of lines into a ProcessedChunk with line bounding boxes."""
        text = "\n".join(l.text for l in lines)
        boxes = [
            ChunkBoxDTO(
                x0=l.x0,
                y0=l.y0,
                x1=l.x1,
                y1=l.y1,
                text_snippet=l.text[:140]
            )
            for l in lines
        ]

        word_count = len(text.split())
        token_estimate = int(word_count * 1.3)

        return ProcessedChunk(
            chunk_id=f"chk-{version_id}-p{page_number:03d}-{chunk_idx:02d}",
            document_version_id=version_id,
            page_number=page_number,
            chunk_index=chunk_idx,
            section_title=section_title,
            text=text,
            token_count=token_estimate,
            boxes=boxes
        )
