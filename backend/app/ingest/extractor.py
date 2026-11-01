"""PDF Coordinate and Text Extraction Service using PyMuPDF.

Enforces Blueprint Section 7.2 & 7.3:
- Reads words with bounding boxes [x0, y0, x1, y1] in PDF points.
- Captures page width, height, and rotation.
- Groups words into line-level bounding boxes.
- Detects digital text layer vs scanned pages requiring OCR fallback.
"""

from dataclasses import dataclass, field
import io
from typing import Any, Dict, List, Optional, Tuple
import pymupdf
from backend.app.core.logging import logger


@dataclass
class ExtractedWord:
    """Single word with bounding box in PDF points."""
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    block_no: int
    line_no: int
    word_no: int


@dataclass
class ExtractedLine:
    """Ordered line-level bounding box merging words on the same line."""
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    block_no: int
    line_no: int
    font_size_estimate: float = 10.0


@dataclass
class ExtractedPage:
    """Full page representation with geometry, text, and coordinate boxes."""
    page_number: int  # 1-indexed
    width: float
    height: float
    rotation: int
    raw_text: str
    lines: List[ExtractedLine] = field(default_factory=list)
    ocr_used: bool = False
    word_count: int = 0


class PDFCoordinateExtractor:
    """Extracts text, page dimensions, and point-accurate bounding boxes from PDF documents."""

    @classmethod
    def extract_from_bytes(cls, pdf_bytes: bytes) -> List[ExtractedPage]:
        """Extracts text and line-level bounding boxes for all pages in PDF."""
        pages: List[ExtractedPage] = []

        try:
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            logger.error(f"Failed to open PDF stream in PyMuPDF: {e}")
            # If not a valid PDF (e.g. HTML payload), return fallback single page
            return cls._fallback_html_extraction(pdf_bytes)

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            page_num = page_idx + 1
            rect = page.rect
            width = float(rect.width)
            height = float(rect.height)
            rotation = page.rotation

            raw_text = page.get_text("text").strip()
            word_tuples = page.get_text("words")  # (x0, y0, x1, y1, word, block_no, line_no, word_no)

            # Detect text layer health per Blueprint Section 7.2
            has_sufficient_text = len(word_tuples) >= 8 or len(raw_text) >= 50
            ocr_used = False

            if not has_sufficient_text:
                # Page is image-scanned or has empty text layer
                logger.warning(f"Page {page_num} has insufficient text layer ({len(word_tuples)} words). Flagging for OCR.")
                ocr_used = True
                # Attempt OCR fallback if available
                ocr_lines, ocr_text = cls._attempt_ocr_fallback(page)
                if ocr_lines:
                    pages.append(ExtractedPage(
                        page_number=page_num,
                        width=width,
                        height=height,
                        rotation=rotation,
                        raw_text=ocr_text,
                        lines=ocr_lines,
                        ocr_used=True,
                        word_count=len(ocr_text.split())
                    ))
                    continue

            # Group words by (block_no, line_no) into clean line bounding boxes
            lines_map: Dict[Tuple[int, int], List[ExtractedWord]] = {}
            for w in word_tuples:
                x0, y0, x1, y1, word_str, block_no, line_no, word_no = w
                ew = ExtractedWord(
                    x0=round(float(x0), 2),
                    y0=round(float(y0), 2),
                    x1=round(float(x1), 2),
                    y1=round(float(y1), 2),
                    text=word_str,
                    block_no=int(block_no),
                    line_no=int(line_no),
                    word_no=int(word_no)
                )
                key = (ew.block_no, ew.line_no)
                if key not in lines_map:
                    lines_map[key] = []
                lines_map[key].append(ew)

            extracted_lines: List[ExtractedLine] = []
            for (b_no, l_no), words in sorted(lines_map.items()):
                words.sort(key=lambda w: w.word_no)
                line_text = " ".join(w.text for w in words)
                lx0 = min(w.x0 for w in words)
                ly0 = min(w.y0 for w in words)
                lx1 = max(w.x1 for w in words)
                ly1 = max(w.y1 for w in words)
                font_est = max(8.0, ly1 - ly0)

                extracted_lines.append(ExtractedLine(
                    x0=lx0,
                    y0=ly0,
                    x1=lx1,
                    y1=ly1,
                    text=line_text,
                    block_no=b_no,
                    line_no=l_no,
                    font_size_estimate=round(font_est, 1)
                ))

            pages.append(ExtractedPage(
                page_number=page_num,
                width=width,
                height=height,
                rotation=rotation,
                raw_text=raw_text,
                lines=extracted_lines,
                ocr_used=ocr_used,
                word_count=len(word_tuples)
            ))

        doc.close()
        return pages

    @classmethod
    def _attempt_ocr_fallback(cls, page: Any) -> Tuple[List[ExtractedLine], str]:
        """Tries to extract text using PyMuPDF OCR or pytesseract if available."""
        try:
            # Check if PyMuPDF's built-in OCR is available
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")
            # If pytesseract is installed:
            import pytesseract
            from PIL import Image
            img = Image.open(io.BytesIO(img_bytes))
            ocr_text = pytesseract.image_to_string(img, lang="eng")
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

            lines: List[ExtractedLine] = []
            scale_x = page.rect.width / pix.width
            scale_y = page.rect.height / pix.height

            for i in range(len(data["text"])):
                w_text = data["text"][i].strip()
                if w_text and int(data["conf"][i]) > 30:
                    x = data["left"][i] * scale_x
                    y = data["top"][i] * scale_y
                    w = data["width"][i] * scale_x
                    h = data["height"][i] * scale_y
                    lines.append(ExtractedLine(
                        x0=round(x, 2),
                        y0=round(y, 2),
                        x1=round(x + w, 2),
                        y1=round(y + h, 2),
                        text=w_text,
                        block_no=int(data["block_num"][i]),
                        line_no=int(data["line_num"][i])
                    ))
            return lines, ocr_text
        except Exception:
            # OCR engine not installed or failed gracefully per Blueprint Section 7.5
            return [], ""

    @classmethod
    def _fallback_html_extraction(cls, raw_bytes: bytes) -> List[ExtractedPage]:
        """Generates coordinate-mapped page structure for HTML or text payloads."""
        text = raw_bytes.decode("utf-8", errors="replace")
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        extracted_lines: List[ExtractedLine] = []
        y_cursor = 72.0
        for idx, line in enumerate(lines[:80]):
            extracted_lines.append(ExtractedLine(
                x0=72.0,
                y0=round(y_cursor, 2),
                x1=round(min(523.0, 72.0 + len(line) * 6.0), 2),
                y1=round(y_cursor + 14.0, 2),
                text=line,
                block_no=idx,
                line_no=0
            ))
            y_cursor += 18.0

        return [ExtractedPage(
            page_number=1,
            width=595.0,
            height=max(842.0, y_cursor + 72.0),
            rotation=0,
            raw_text=text[:3000],
            lines=extracted_lines,
            ocr_used=False,
            word_count=len(text.split())
        )]
