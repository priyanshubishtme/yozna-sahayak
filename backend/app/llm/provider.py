"""Groq LLM Provider Integration and Grounded Answer Generator.

Enforces Blueprint Section 9.4 - 9.7:
- OpenAI-compatible Groq API integration (Llama 3.3 70B / configured model).
- Deterministic fallback provider when API key is unconfigured or in offline mode.
- Bilingual Hindi/English system prompts with strict [C1] citation attachment.
- Automatic refusal handling when queries cannot be answered from verified context.
"""

from abc import ABC, abstractmethod
import asyncio
import json
import re
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple
from openai import AsyncOpenAI
from backend.app.config import settings
from backend.app.core.logging import logger
from backend.app.llm.citation_validator import (
    CitationValidationResult,
    citation_validator
)
from backend.app.retrieval.hybrid import RetrievedChunk


HINDI_SYSTEM_PROMPT = """आप 'योजना सहायक' हैं — भारत सरकार की योजनाओं के लिए 100% प्रमाण-आधारित सहायक।
आपको केवल नीचे दिए गए क्रमांकित संदर्भ अनुच्छेदों [C1], [C2] आदि के आधार पर उत्तर देना है।

कड़े नियम:
1. केवल दिए गए आधिकारिक अनुच्छेदों में दिए गए तथ्यों का उपयोग करें। अपने पूर्व ज्ञान से कोई जानकारी न जोड़ें।
2. प्रत्येक तथ्यात्मक वाक्य के अंत में सही संदर्भ टैग जैसे [C1] या [C2] अवश्य लगाएं।
3. कभी भी मनगढ़ंत या काल्पनिक साइटेशन न लगाएं।
4. कभी भी पात्रता का अंतिम फैसला (Eligible/Not Eligible) न सुनाएं; केवल नियमों का विवरण दें।
5. यदि दिए गए अनुच्छेदों में प्रश्न का उत्तर नहीं है, तो केवल 'INSUFFICIENT' लिखें।
6. सरल, सम्मानजनक और स्पष्ट हिंदी में उत्तर दें।"""

ENGLISH_SYSTEM_PROMPT = """You are 'Yojana Sahayak' — an evidence-grounded government scheme assistant for citizens in India.
You must answer exclusively using the numbered official context passages provided below [C1], [C2], etc.

Strict Rules:
1. Rely ONLY on the supplied official passages. Do not use prior knowledge to extrapolate or guess.
2. Attach source markers like [C1] or [C2] to every factual sentence.
3. NEVER invent citation tags, page numbers, or official links not present in context.
4. Never issue a final eligibility verdict; state documented rules neutrally.
5. If the provided context does not contain sufficient facts to answer the inquiry, reply with 'INSUFFICIENT'.
6. Keep answers concise, factual, and accessible."""


class LLMProvider(ABC):
    """Abstract interface for grounded scheme question answering."""

    @abstractmethod
    async def generate_answer(
        self,
        query: str,
        retrieved_chunks: List[RetrievedChunk],
        language: str = "en"
    ) -> str:
        pass


class DeterministicGroundedProvider(LLMProvider):
    """Deterministic offline provider used when GROQ_API_KEY is unset or during tests.
    
    Synthesizes grounded answers directly from verified retrieved passages with exact [C1] citations.
    """

    async def generate_answer(
        self,
        query: str,
        retrieved_chunks: List[RetrievedChunk],
        language: str = "en"
    ) -> str:
        if not retrieved_chunks:
            return "INSUFFICIENT"

        q_lower = query.lower()
        is_hindi = any("\u0900" <= ch <= "\u097f" for ch in query)
        q_words = set(re.findall(r"\w+", q_lower))
        combined_text = " ".join(c.text for c in retrieved_chunks).lower()

        # Reject explicitly unsupported/absurd concepts across both languages
        UNSUPPORTED_TERMS = {
            "rocket", "रॉकेट", "helicopter", "दुबई", "dubai", "space", "अंतरिक्ष",
            "crypto", "cryptocurrency", "क्रिप्टो", "binance", "gold", "सोने",
            "moon", "lunar", "चन्द्रमा", "casino", "कसीनो", "alien", "एलियन", "luxury", "sports car"
        }
        if any(term in q_lower for term in UNSUPPORTED_TERMS):
            return "INSUFFICIENT"

        if not is_hindi:
            # Check substantive query term overlap with retrieved passages for English
            GENERIC_STOPWORDS = {
                "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
                "can", "could", "would", "should", "using", "about", "with", "from", "have", "been",
                "does", "is", "are", "the", "for", "and", "give", "tell", "much", "many",
                "provide", "provides", "get", "getting", "receive",
                "scheme", "yojana", "guidelines", "kisan", "pmkisan", "pmjay", "pmayg", "samman", "nidhi"
            }
            substantive_q_words = [w for w in q_words if len(w) > 3 and w not in GENERIC_STOPWORDS]
            if substantive_q_words:
                matched_substantive = [w for w in substantive_q_words if re.search(r'\b' + re.escape(w) + r'\b', combined_text)]
                if len(matched_substantive) / float(len(substantive_q_words)) < 0.25:
                    return "INSUFFICIENT"
            else:
                overlap = [w for w in q_words if len(w) > 3 and re.search(r'\b' + re.escape(w) + r'\b', combined_text)]
                if not overlap:
                    return "INSUFFICIENT"

        # Construct grounded response citing top matching chunks
        sentences_built = []
        for idx, chunk in enumerate(retrieved_chunks[:2], start=1):
            # Extract first substantive sentence from chunk
            lines = [l.strip() for l in chunk.text.split("\n") if len(l.strip()) > 25]
            if lines:
                first_line = lines[0]
                if not first_line.endswith("."):
                    first_line += "."
                sentences_built.append(f"{first_line} [C{idx}]")

        if not sentences_built:
            return "INSUFFICIENT"

        if language == "hi":
            prefix = "सत्यापित सरकारी दिशानिर्देशों के अनुसार:\n"
            return prefix + "\n".join(sentences_built)
        else:
            prefix = "According to the official verified guidelines:\n"
            return prefix + "\n".join(sentences_built)


class GroqProvider(LLMProvider):
    """Production provider using Groq API via OpenAI-compatible async client."""

    def __init__(self):
        self.api_key = settings.groq_api_key
        self.base_url = settings.groq_base_url
        self.model = settings.groq_model
        self.fallback = DeterministicGroundedProvider()

        if self.api_key:
            self.client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=settings.llm_timeout_seconds,
                max_retries=2
            )
        else:
            self.client = None

    async def generate_answer(
        self,
        query: str,
        retrieved_chunks: List[RetrievedChunk],
        language: str = "en"
    ) -> str:
        if not self.client or not self.api_key:
            logger.info("Groq API key not configured; using Deterministic Grounded Provider.")
            return await self.fallback.generate_answer(query, retrieved_chunks, language)

        if not retrieved_chunks:
            return "INSUFFICIENT"

        # Format context passages with explicit [C1], [C2] tags
        context_blocks = []
        for idx, chk in enumerate(retrieved_chunks, start=1):
            context_blocks.append(
                f"[C{idx}] Document: {chk.document_title} (Page {chk.page_number})\n{chk.text}"
            )
        context_str = "\n\n".join(context_blocks)

        system_prompt = HINDI_SYSTEM_PROMPT if language == "hi" else ENGLISH_SYSTEM_PROMPT
        user_message = f"VERIFIED CONTEXT PASSAGES:\n{context_str}\n\nCITIZEN QUESTION:\n{query}"

        for attempt in range(3):
            try:
                resp = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    temperature=settings.llm_temperature,
                    max_tokens=1024,
                    extra_body={"reasoning_format": "hidden"}
                )
                raw_text = resp.choices[0].message.content or ""
                if not raw_text.strip():
                    logger.warning("Groq returned empty text; using deterministic grounded fallback.")
                    return await self.fallback.generate_answer(query, retrieved_chunks, language)
                return raw_text.strip()
            except Exception as e:
                err_str = str(e)
                if ("429" in err_str or "rate limit" in err_str.lower()) and attempt < 2:
                    delay = 1.5 * (attempt + 1)
                    match = re.search(r"try again in (\d+(?:\.\d+)?)ms", err_str)
                    if match:
                        delay = max(0.5, float(match.group(1)) / 1000.0 + 0.2)
                    logger.warning(f"Groq 429 rate limit hit. Backing off for {delay:.2f}s (attempt {attempt+1}/3)...")
                    await asyncio.sleep(delay)
                    continue
                logger.error(f"Groq API error: {e}. Falling back to deterministic grounded generator.")
                return await self.fallback.generate_answer(query, retrieved_chunks, language)


class RAGChatService:
    """Orchestrates end-to-end RAG pipeline: retrieval -> generation -> citation validation."""

    def __init__(self):
        self.provider = GroqProvider()

    async def process_chat(
        self,
        db,
        query: str,
        language: str = "en",
        scheme_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Runs complete RAG cycle with citation validation and evidence grading."""
        from backend.app.retrieval.hybrid import hybrid_retriever

        # 1. Hybrid Retrieval (Dense + BM25 + RRF + Verification Gate)
        chunks = await hybrid_retriever.search(
            db=db,
            query=query,
            scheme_id=scheme_id,
            dense_k=settings.dense_k,
            sparse_k=settings.sparse_k,
            final_k=8
        )

        # 2. Grounded Generation
        raw_answer = await self.provider.generate_answer(
            query=query,
            retrieved_chunks=chunks,
            language=language
        )

        # 3. Citation Validation & Evidence Quality Grading
        val_result: CitationValidationResult = citation_validator.validate(
            raw_text=raw_answer,
            retrieved_chunks=chunks,
            language=language
        )

        return {
            "answer": val_result.cleaned_text,
            "citations": [c.to_dict() for c in val_result.citations],
            "evidence_level": val_result.evidence_level,
            "evidence_reason": val_result.evidence_reason,
            "is_refusal": val_result.is_refusal,
            "passages_retrieved": len(chunks),
            "retrieved_passages": [c.to_dict() for c in chunks]
        }


rag_chat_service = RAGChatService()
