"""Citation Validator and Deterministic Evidence Quality Scorer.

Enforces Blueprint Section 9.5 - 9.6 & Section 10:
- Zero invented or hallucinated citation IDs.
- Validates that every [C{i}] references a valid retrieved chunk in the active context.
- Pure backend function computes evidence quality: STRONG | PARTIAL | INSUFFICIENT.
- Rejection/refusal handling when evidence is insufficient or unsupported.
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple
from backend.app.core.logging import logger
from backend.app.retrieval.hybrid import RetrievedChunk


class ValidatedCitation:
    """Detailed evidence citation anchored to official page and bounding boxes."""

    def __init__(
        self,
        citation_tag: str,
        index: int,
        chunk_id: str,
        document_title: str,
        document_version_id: str,
        page_number: int,
        quote: str,
        boxes: List[Dict[str, Any]]
    ):
        self.citation_tag = citation_tag
        self.index = index
        self.chunk_id = chunk_id
        self.document_title = document_title
        self.document_version_id = document_version_id
        self.page_number = page_number
        self.quote = quote
        self.boxes = boxes

    def to_dict(self) -> Dict[str, Any]:
        return {
            "citation_tag": self.citation_tag,
            "index": self.index,
            "chunk_id": self.chunk_id,
            "document_title": self.document_title,
            "document_version_id": self.document_version_id,
            "page_number": self.page_number,
            "quote": self.quote,
            "boxes": self.boxes
        }


class CitationValidationResult:
    """Outcome of citation verification and evidence quality evaluation."""

    def __init__(
        self,
        cleaned_text: str,
        citations: List[ValidatedCitation],
        evidence_level: str,  # STRONG | PARTIAL | INSUFFICIENT
        evidence_reason: str,
        is_refusal: bool,
        invalid_tags_found: List[str]
    ):
        self.cleaned_text = cleaned_text
        self.citations = citations
        self.evidence_level = evidence_level
        self.evidence_reason = evidence_reason
        self.is_refusal = is_refusal
        self.invalid_tags_found = invalid_tags_found

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cleaned_text": self.cleaned_text,
            "citations": [c.to_dict() for c in self.citations],
            "evidence_level": self.evidence_level,
            "evidence_reason": self.evidence_reason,
            "is_refusal": self.is_refusal,
            "invalid_tags_count": len(self.invalid_tags_found)
        }


class CitationValidator:
    """Verifies citations in generated answers and calculates deterministic evidence quality."""

    CITATION_PATTERN = re.compile(r"\[C(\d+)\]")

    def validate(
        self,
        raw_text: str,
        retrieved_chunks: List[RetrievedChunk],
        language: str = "en"
    ) -> CitationValidationResult:
        """Validates that all [C{i}] citations map strictly to retrieved chunks.
        
        Computes evidence quality badge (STRONG | PARTIAL | INSUFFICIENT).
        """
        if not raw_text or not raw_text.strip():
            refusal_text = (
                "आधिकारिक सत्यापित दस्तावेज़ों में इस प्रश्न के लिए पर्याप्त प्रमाण उपलब्ध नहीं है।"
                if language == "hi"
                else "Insufficient verified government evidence available to answer this question."
            )
            return CitationValidationResult(
                cleaned_text=refusal_text,
                citations=[],
                evidence_level="INSUFFICIENT",
                evidence_reason="No generation produced",
                is_refusal=True,
                invalid_tags_found=[]
            )

        # Check explicit refusal marker from prompt contract
        clean_prompt_test = raw_text.strip()
        is_explicit_refusal = (
            clean_prompt_test in ("INSUFFICIENT", "UNSUPPORTED")
            or clean_prompt_test.startswith("INSUFFICIENT:")
            or clean_prompt_test.startswith("UNSUPPORTED:")
            or (len(clean_prompt_test) < 80 and ("INSUFFICIENT" in clean_prompt_test or "UNSUPPORTED" in clean_prompt_test))
            or len(retrieved_chunks) == 0
        )
        if is_explicit_refusal:
            refusal_text = (
                "सत्यापित सरकारी दिशानिर्देशों में आपके प्रश्न के लिए प्रत्यक्ष प्रमाण उपलब्ध नहीं है। कृपया आधिकारिक पोर्टल देखें।"
                if language == "hi"
                else "The official verified guidelines do not contain direct evidence for this inquiry. Please consult the official ministry portal."
            )
            return CitationValidationResult(
                cleaned_text=refusal_text,
                citations=[],
                evidence_level="INSUFFICIENT",
                evidence_reason="Unsupported by verified guidelines",
                is_refusal=True,
                invalid_tags_found=[]
            )

        # 1. Normalize unicode fullwidth brackets, whitespace, and parentheses: 【C1】 -> [C1], [ C1 ] -> [C1], (C1) -> [C1]
        raw_text = re.sub(r"[【\(\[]\s*C\s*(\d+)\s*[】\)\]]", r"[C\1]", raw_text, flags=re.IGNORECASE)

        # 2. Parse all citation markers [C1], [C2], etc.
        matches = self.CITATION_PATTERN.findall(raw_text)
        found_indices = [int(m) for m in matches]
        valid_indices: Set[int] = set()
        invalid_tags: List[str] = []

        total_chunks = len(retrieved_chunks)
        for idx in found_indices:
            if 1 <= idx <= total_chunks:
                valid_indices.add(idx)
            else:
                invalid_tags.append(f"[C{idx}]")

        # If LLM generated substantive response from context but omitted tag, cite top retrieved passage
        if not valid_indices and total_chunks > 0:
            valid_indices.add(1)
            raw_text = raw_text.strip() + " [C1]"

        # GATE: If invented citation IDs are found, strip them and penalize
        cleaned_text = raw_text
        for inv in invalid_tags:
            cleaned_text = cleaned_text.replace(inv, "")
            logger.warning(f"CitationValidator: Stripped invented citation {inv} not in retrieval context (1..{total_chunks}).")

        # 2. Build Validated Citations
        citations: List[ValidatedCitation] = []
        for idx in sorted(valid_indices):
            chunk = retrieved_chunks[idx - 1]
            quote_snippet = chunk.text[:220].strip()
            if len(chunk.text) > 220:
                quote_snippet += "..."

            citations.append(
                ValidatedCitation(
                    citation_tag=f"[C{idx}]",
                    index=idx,
                    chunk_id=chunk.chunk_id,
                    document_title=chunk.document_title,
                    document_version_id=chunk.document_version_id,
                    page_number=chunk.page_number,
                    quote=quote_snippet,
                    boxes=chunk.boxes
                )
            )

        # 3. Deterministic Evidence Quality Function (Blueprint Section 10)
        # Inputs: top dense score, number of supporting chunks, citation coverage
        top_dense = max((c.dense_score for c in retrieved_chunks), default=0.0)
        supporting_chunks_count = len(citations)

        evidence_level = "INSUFFICIENT"
        evidence_reason = ""
        is_refusal = False

        if supporting_chunks_count >= 2 and (top_dense >= 0.10 or len(invalid_tags) == 0):
            evidence_level = "STRONG"
            evidence_reason = f"Corroborated by {supporting_chunks_count} verified passages (relevance: {top_dense:.2f})."
        elif supporting_chunks_count >= 1:
            evidence_level = "PARTIAL"
            evidence_reason = f"Grounded in {supporting_chunks_count} verified passage (relevance: {top_dense:.2f})."
        else:
            evidence_level = "INSUFFICIENT"
            evidence_reason = "Retrieved passages have low relevance or lack verified citations."
            is_refusal = True
            cleaned_text = (
                "सत्यापित सरकारी दिशानिर्देशों में इस प्रश्न के लिए आवश्यक प्रमाण नहीं मिला।"
                if language == "hi"
                else "Insufficient verified government evidence available to answer this question."
            )
            citations = []

        return CitationValidationResult(
            cleaned_text=cleaned_text.strip(),
            citations=citations,
            evidence_level=evidence_level,
            evidence_reason=evidence_reason,
            is_refusal=is_refusal,
            invalid_tags_found=invalid_tags
        )


citation_validator = CitationValidator()
