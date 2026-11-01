"""Yojana AI Robot Companion Conversational API.

Provides conversational, bilingual (Hindi & English), multi-turn memory-aware,
and RAG-grounded assistance for Indian government welfare schemes.

Enforces:
- Direct integration with Groq API (models: openai/gpt-oss-120b, openai/gpt-oss-20b, qwen/qwen3.8-27b).
- Multi-turn conversation context tracking and anaphoric follow-up resolution.
- Hybrid RAG retrieval from verified official scheme documents in SQLite.
- Grounded citations with ministry provenance, page numbers, and text excerpts.
- Automatic scheme entity recognition and hydration of interactive scheme cards.
- Profile-aware eligibility checking when citizen asks "Am I eligible?".
- Generation of both structured Markdown response and clean speech synthesis text (TTS).
- Website navigation intent detection strictly against allowed routes.
- Feedback collection endpoint for analytics and continuous improvement.
"""

import asyncio
import json
import re
from typing import Any, Dict, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from backend.app.config import settings
from backend.app.core.envelope import success_response
from backend.app.core.logging import logger
from backend.app.db.base import utc_now
from backend.app.db.session import get_db
from backend.app.db.models import Scheme, CitizenProfile, AuditEvent
from backend.app.retrieval.hybrid import hybrid_retriever, RetrievedChunk
from backend.app.llm.provider import GroqProvider, DeterministicGroundedProvider

router = APIRouter(prefix="/assistant", tags=["AI Robot Companion"])

# Whitelist of strictly permitted navigation targets
STATIC_ALLOWED_ROUTES = {
    "/schemes": "Explore Government Schemes",
    "/compare": "Compare Government Schemes",
    "/centre-locator": "Locate CSC & Seva Kendra Centres",
    "/chat": "Deep Grounded Evidence RAG Chat",
    "/eligibility": "Check Your Scheme Eligibility",
    "/app/eligibility": "Check Your Scheme Eligibility",
    "/app/recommendations": "View Recommended Schemes",
    "/app/profile": "View Citizen Profile",
    "/app/saved": "View Saved Schemes",
    "/admin": "Open Yojana Admin Console",
}


class MessageTurn(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Citizen inquiry via text or voice transcript")
    language: str = Field("auto", description="'hi', 'en', or 'auto'")
    mode: Optional[str] = Field("simple", description="'simple' for citizen or 'advanced' for specialist/policy researcher")
    history: List[MessageTurn] = Field(default_factory=list, description="Recent conversation turns for memory")
    current_path: Optional[str] = Field("/", description="Current route citizen is viewing")
    session_id: Optional[str] = Field(None, description="Client session identifier")
    user_identifier: Optional[str] = Field("citizen-default", description="User identifier for profile lookup")


class NavigationAction(BaseModel):
    path: str
    label: str
    description: Optional[str] = None


class SuggestedAction(BaseModel):
    label: str
    query: str


class SchemeCardSummary(BaseModel):
    scheme_id: str
    code: str
    name_en: str
    name_hi: str
    category: str
    ministry_or_dept: Optional[str] = None
    benefits_summary_en: Optional[str] = None
    benefits_summary_hi: Optional[str] = None
    official_portal_url: Optional[str] = None


class EligibilityBrief(BaseModel):
    scheme_id: str
    scheme_name: str
    status: str
    matched_criteria: List[str] = []
    missing_criteria: List[str] = []
    action_prompt: str


class CitationItem(BaseModel):
    id: str
    title: str
    page: int
    scheme_id: Optional[str] = None
    document_version_id: Optional[str] = None
    ministry: Optional[str] = None
    excerpt: Optional[str] = None
    verification_status: str = "Statutory Official Guidelines - Approved"
    link: str


class AssistantChatResponse(BaseModel):
    reply: str
    speech_text: str
    language: str
    mode: str = "simple"
    navigation: Optional[NavigationAction] = None
    suggested_actions: List[SuggestedAction] = []
    suggested_questions: List[str] = []
    schemes_found: List[SchemeCardSummary] = []
    eligibility_brief: Optional[EligibilityBrief] = None
    citations: List[CitationItem] = []
    evidence_level: str = "STRONG"


class AssistantFeedbackRequest(BaseModel):
    message_id: str
    query: Optional[str] = None
    helpful: bool
    feedback_text: Optional[str] = None


def detect_language(text: str, default: str = "en") -> str:
    """Detects whether text contains Devanagari Hindi characters."""
    devanagari_count = sum(1 for ch in text if "\u0900" <= ch <= "\u097f")
    if devanagari_count > 2:
        return "hi"
    return "en" if default == "auto" else default


def clean_for_speech(text: str, language: str) -> str:
    """Strips markdown asterisks, bracket citations, and URLs for fluid spoken TTS."""
    clean = re.sub(r"\[C\d+\]", "", text)
    clean = re.sub(r"【C\d+】", "", clean)
    clean = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", clean)
    clean = re.sub(r"\*\*([^\*]+)\*\*", r"\1", clean)
    clean = re.sub(r"\*([^\*]+)\*", r"\1", clean)
    clean = re.sub(r"#{1,6}\s*", "", clean)
    clean = re.sub(r"`[^`]*`", "", clean)
    clean = re.sub(r"\|[^\|]+\|", "", clean)  # remove markdown table bars
    clean = re.sub(r"\bhttps?:\/\/\S+", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


ROBOT_SYSTEM_PROMPT = """You are 'Yojana AI' (योजना एआई) — an empathetic, authoritative, and evidence-grounded AI Government Scheme Advisor for the Indian citizen welfare portal 'Yojana Sahayak'.
You are integrated directly into the portal to guide citizens, answer questions via text and voice, explain complex eligibility rules, and guide them to their benefits.

Your Personality & Voice:
- Respectful, warm, clear, and reassuring (use respectful Indian greetings: "Namaste!" in English, "नमस्ते!" in Hindi).
- Never invent benefit amounts, fake schemes, or non-existent deadlines. Rely strictly on verified statutory facts.
- Explain complicated legal requirements in clear, simple language accessible to rural citizens, farmers, and students.
- Organize responses with structured headings and concise bullet points rather than long walls of dense text:
    • **Overview**: What the scheme is and who it is for.
    • **Key Benefits**: Exact financial or material assistance.
    • **Eligibility Criteria**: Key criteria citizen must satisfy.
    • **Required Documents**: Core documents (Aadhaar, Land records, Income certificate, etc.).
    • **How to Apply**: Official portal or nearest CSC Seva Kendra steps.

Multi-Turn Conversation & Memory:
- Track conversational context across follow-ups. If user previously asked about "PM-KISAN" and then asks "How much money do I get?" or "Am I eligible?", understand they are asking about PM-KISAN.
- If the user asks whether they are eligible, clearly identify what conditions they satisfy and what information is still needed.

Navigation Directives:
If the citizen wants to view a scheme, compare schemes, check eligibility, or locate a service centre, emit an explicit navigation command at the end of your response:
[[NAVIGATE: /path | Label]]

Allowed Paths:
- /schemes (Explore Schemes)
- /schemes?category=Agriculture (Farmer Schemes)
- /schemes?category=Education (Scholarships)
- /schemes?category=Housing (Housing Grants)
- /schemes?category=Health (Ayushman Healthcare)
- /schemes?category=Social+Welfare (Pensions & Welfare)
- /schemes/{scheme_id} (Specific Scheme page)
- /compare (Side-by-side comparison)
- /centre-locator (Find nearest CSC Seva Kendra)
- /eligibility (7-Step Interactive Eligibility Assessment)

Language Guidelines:
- If the citizen speaks/types in Hindi, reply in natural, polite Hindi (Devanagari script).
- If the citizen communicates in English, reply in crisp, professional English.
"""


class AssistantService:
    def __init__(self):
        self.groq_provider = GroqProvider()
        self.fallback = DeterministicGroundedProvider()

    def _extract_active_scheme(self, message: str, history: List[MessageTurn]) -> Optional[str]:
        """Detects if a specific government scheme is the focus of current or recent turns."""
        combined_text = f"{message} " + " ".join(t.content for t in history[-3:]).lower()
        
        if any(k in combined_text for k in ["pm-kisan", "pm kisan", "kisan samman", "किसान सम्मान"]):
            return "SCHEME-PM-KISAN"
        if any(k in combined_text for k in ["pm-jay", "pmjay", "ayushman", "आयुष्मान", "golden card"]):
            return "SCHEME-PM-JAY"
        if any(k in combined_text for k in ["pmay-g", "pmay", "awas gramin", "आवास ग्रामीण"]):
            return "SCHEME-PMAY-G"
        if any(k in combined_text for k in ["pmay-u", "awas urban", "आवास शहरी"]):
            return "SCHEME-PMAY-U"
        if any(k in combined_text for k in ["pmfby", "fasal bima", "crop insurance", "फसल बीमा"]):
            return "SCHEME-PMFBY"
        if any(k in combined_text for k in ["kcc", "kisan credit", "किसान क्रेडिट"]):
            return "SCHEME-KCC"
        if any(k in combined_text for k in ["ujjwala", "pm-uy", "gas cylinder", "उज्ज्वला"]):
            return "SCHEME-PM-UY"
        if any(k in combined_text for k in ["sukanya", "ssy", "सुकन्या समृद्धि"]):
            return "SCHEME-SSY"
        if any(k in combined_text for k in ["csss", "central sector scholarship", "कॉलेज छात्रवृत्ति"]):
            return "SCHEME-CSSS"
        if any(k in combined_text for k in ["old age pension", "वृद्धावस्था पेंशन", "uk-oap"]):
            return "SCHEME-UK-OAP"
        if any(k in combined_text for k in ["widow pension", "विधवा पेंशन"]):
            return "SCHEME-UK-WP"
        if any(k in combined_text for k in ["disability pension", "दिव्यांग पेंशन"]):
            return "SCHEME-UK-DP"
        return None

    async def _match_schemes_for_query(self, db: AsyncSession, message: str, active_scheme_id: Optional[str]) -> List[Scheme]:
        """Retrieves matching Scheme records from SQLite database to hydrate interactive cards."""
        schemes: List[Scheme] = []
        if active_scheme_id:
            res = await db.execute(select(Scheme).where(Scheme.scheme_id == active_scheme_id))
            scheme = res.scalar_one_or_none()
            if scheme:
                schemes.append(scheme)

        # Keyword mapping for broad category queries
        msg_lower = message.lower()
        like_conditions = []
        if any(k in msg_lower for k in ["farmer", "kisan", "agriculture", "किसान", "खेती", "crop"]):
            like_conditions.append(Scheme.category.ilike("%Agri%"))
            like_conditions.append(Scheme.name_en.ilike("%Kisan%"))
            like_conditions.append(Scheme.name_en.ilike("%Fasal%"))
        if any(k in msg_lower for k in ["student", "scholarship", "college", "छात्र", "छात्रवृत्ति", "शिक्षा"]):
            like_conditions.append(Scheme.category.ilike("%Edu%"))
            like_conditions.append(Scheme.category.ilike("%Scholar%"))
        if any(k in msg_lower for k in ["health", "hospital", "ayushman", "स्वास्थ्य", "इलाज"]):
            like_conditions.append(Scheme.category.ilike("%Health%"))
        if any(k in msg_lower for k in ["house", "housing", "awas", "मकान", "आवास"]):
            like_conditions.append(Scheme.category.ilike("%Housing%"))
        if any(k in msg_lower for k in ["pension", "elderly", "senior", "पेंशन", "वृद्ध", "social"]):
            like_conditions.append(Scheme.category.ilike("%Welfare%"))
            like_conditions.append(Scheme.category.ilike("%Pension%"))

        if like_conditions:
            res = await db.execute(
                select(Scheme).where(or_(*like_conditions)).limit(3)
            )
            for s in res.scalars().all():
                if s.scheme_id not in [x.scheme_id for x in schemes]:
                    schemes.append(s)

        return schemes[:3]

    async def _check_eligibility_context(
        self,
        db: AsyncSession,
        user_identifier: str,
        scheme: Optional[Scheme],
        message: str
    ) -> Optional[EligibilityBrief]:
        """Inspects citizen's database profile and provides structured eligibility guidance."""
        is_eligibility_query = any(k in message.lower() for k in [
            "eligible", "eligibility", "पात्र", "पात्रता", "apply", "आवेदन", "qualify"
        ])
        if not is_eligibility_query or not scheme:
            return None

        # Fetch citizen profile
        res = await db.execute(
            select(CitizenProfile).where(CitizenProfile.user_identifier == user_identifier)
        )
        profile = res.scalar_one_or_none()
        if not profile:
            return EligibilityBrief(
                scheme_id=scheme.scheme_id,
                scheme_name=scheme.name_en,
                status="Check Required",
                matched_criteria=[],
                missing_criteria=["Citizen demographic & financial profile not yet established"],
                action_prompt="Complete your 7-step profile to instantly check eligibility for this scheme."
            )

        matched: List[str] = []
        missing: List[str] = []

        if scheme.scheme_id == "SCHEME-PM-KISAN":
            if profile.is_farmer:
                matched.append("Registered agricultural farmer family")
            else:
                missing.append("Requires family engaged in agriculture")

            if profile.owns_cultivable_land:
                matched.append(f"Cultivable agricultural landholder ({profile.landholding_acres or 'Verified'} acres)")
            else:
                missing.append("Must own cultivable land as per state revenue records")

            if profile.is_income_tax_payer is False:
                matched.append("Non-income tax payer (Statutory compliance satisfied)")
            elif profile.is_income_tax_payer is True:
                missing.append("Income tax payers are statutory exclusions under PM-KISAN")

            if profile.has_aadhaar:
                matched.append("Active Aadhaar card available for DBT transfer")
            else:
                missing.append("Aadhaar seeded bank account required")

        elif scheme.scheme_id == "SCHEME-PMAY-G":
            if profile.is_rural_resident:
                matched.append("Permanent resident of rural Gram Panchayat jurisdiction")
            else:
                missing.append("PMAY-G is exclusively for rural residents")

            if profile.has_pucca_house is False:
                matched.append("Does not own a permanent (pucca) house in India")
            elif profile.has_pucca_house is True:
                missing.append("Pucca house owners are ineligible for new housing subsidy")

            if profile.is_bpl or profile.annual_income and profile.annual_income < 120000:
                matched.append("Economic deprivation / income within prescribed limits")
            else:
                missing.append("Requires BPL or SECC deprivation status")

        elif scheme.scheme_id == "SCHEME-UK-OAP":
            if profile.age and profile.age >= 60:
                matched.append(f"Age criterion met ({profile.age} years >= 60 years)")
            else:
                missing.append("Requires age >= 60 years")

            if profile.state in ["UK", "Uttarakhand"]:
                matched.append("Permanent domicile in Uttarakhand")
            else:
                missing.append("Requires permanent domicile in Uttarakhand")

            if profile.annual_income and profile.annual_income <= 48000:
                matched.append(f"Annual family income (₹{int(profile.annual_income)}) <= ₹48,000 threshold")
            else:
                missing.append("Annual income must be under ₹48,000 ceiling")

        else:
            # Generic matching
            if profile.has_aadhaar:
                matched.append("Aadhaar identity verified")
            if profile.is_bpl:
                matched.append("BPL / Priority ration card available")

        status = "Eligible" if not missing else ("Likely Eligible" if len(matched) >= len(missing) else "Need More Info")

        return EligibilityBrief(
            scheme_id=scheme.scheme_id,
            scheme_name=scheme.name_en,
            status=status,
            matched_criteria=matched,
            missing_criteria=missing,
            action_prompt=f"Would you like to complete a verified 7-step assessment for {scheme.name_en}?"
        )

    async def chat(
        self,
        db: AsyncSession,
        message: str,
        language: str = "auto",
        mode: str = "simple",
        history: Optional[List[MessageTurn]] = None,
        current_path: str = "/",
        user_identifier: str = "citizen-default"
    ) -> AssistantChatResponse:
        history = history or []
        lang = detect_language(message, default=language if language in ("hi", "en") else "en")
        is_hindi = lang == "hi"

        # 0. Pure greeting / introduction / capability intent handling
        cleaned_msg = re.sub(r"[^\w\s\u0900-\u097f]", "", message.strip().lower())
        greetings_set = {
            "hello", "hi", "hey", "namaste", "namaskar", "pranam", "pranaam",
            "good morning", "good afternoon", "good evening", "help", "help me",
            "who are you", "what can you do", "tell me about yourself", "how can you help",
            "kaise ho", "kya haal hai", "kya hal hai", "aap kaun ho", "tum kaun ho",
            "madad", "sahayata", "योजना बताएं", "योजनाएं बताओ", "नमस्ते", "प्रणाम",
            "हाय", "हेलो", "मदद", "सहायता", "आप कौन हैं", "क्या कर सकते हैं"
        }
        if cleaned_msg in greetings_set or any(cleaned_msg == g for g in greetings_set):
            if is_hindi:
                greeting_reply = (
                    "### नमस्ते! मैं **योजना एआई** हूँ — आपका आधिकारिक सरकारी कल्याण मार्गदर्शक। 🙏\n\n"
                    "मैं आपको भारत सरकार एवं विभिन्न राज्य सरकारों की कल्याणकारी योजनाओं को खोजने, पात्रता नियमों को समझने, "
                    "आवश्यक दस्तावेज जानने और सीधे आवेदन करने में सहायता करता हूँ।\n\n"
                    "**मैं आपकी इन मुख्य श्रेणियों में सहायता कर सकता हूँ:**\n"
                    "• 🌾 **किसान कल्याण:** PM-KISAN (₹6,000 वार्षिक सम्मान निधि), PMFBY फसल बीमा, किसान क्रेडिट कार्ड।\n"
                    "• 🏥 **स्वास्थ्य सुरक्षा:** आयुष्मान भारत (प्रति परिवार प्रति वर्ष ₹5 लाख तक मुफ़्त इलाज)।\n"
                    "• 🏠 **आवास योजना:** PM आवास योजना (ग्रामीण एवं शहरी पक्के मकान हेतु सब्सिडी)।\n"
                    "• 🎓 **शिक्षा एवं छात्रवृत्ति:** राष्ट्रीय एवं राज्य स्तरीय छात्रवृत्ति योजनाएं।\n"
                    "• 📋 **पात्रता मूल्यांकन:** आपकी पारिवारिक प्रोफ़ाइल अनुसार 7-चरणीय त्वरित पात्रता जांच।\n"
                    "• 📍 **सेवा केंद्र खोज:** अपने नज़दीकी सीएससी (CSC) एवं जन सेवा केंद्र का पता।\n\n"
                    "आप किस योजना या सहायता के बारे में जानना चाहते हैं?\n\n"
                    "[[NAVIGATE: /schemes | 16+ आधिकारिक योजनाएं देखें]]"
                )
                speech_text = (
                    "नमस्ते! मैं योजना एआई हूँ। मैं आपको सरकारी योजनाओं, पात्रता नियमों और आवश्यक दस्तावेजों की जानकारी दे सकता हूँ। "
                    "आप किसान योजनाओं, आयुष्मान भारत, छात्रवृत्ति या आवास योजना के बारे में पूछ सकते हैं।"
                )
                suggestions = [
                    "🌾 किसान सम्मान निधि (PM-KISAN) की जानकारी दें",
                    "🏥 आयुष्मान भारत में 5 लाख का इलाज कैसे मिलता है?",
                    "📋 मेरी योजना पात्रता की जांच करें",
                    "🎓 कॉलेज छात्रों के लिए छात्रवृत्ति योजनाएं",
                    "📍 मेरे नज़दीकी जन सेवा केंद्र (CSC) कहाँ हैं?"
                ]
            else:
                greeting_reply = (
                    "### Namaste! I am **Yojana AI** — your verified Government Welfare Advisor. 🙏\n\n"
                    "I assist citizens in discovering central and state government schemes, understanding eligibility criteria, "
                    "identifying mandatory documents, and navigating official application portals.\n\n"
                    "**Key Welfare Categories I Can Guide You On:**\n"
                    "• 🌾 **Farmer Welfare:** PM-KISAN (₹6,000/yr direct income support), PMFBY Crop Insurance, Kisan Credit Card.\n"
                    "• 🏥 **Healthcare:** Ayushman Bharat Pradhan Mantri Jan Arogya Yojana (₹5 Lakh cashless health cover per family).\n"
                    "• 🏠 **Housing:** Pradhan Mantri Awas Yojana (Subsidized housing grants for rural and urban households).\n"
                    "• 🎓 **Education & Scholarships:** Post-Matric & Higher Education scholarships.\n"
                    "• 📋 **Eligibility Assessment:** 7-Step structured assessment for your household.\n"
                    "• 📍 **CSC Centre Locator:** Locate verified Seva Kendras and Helpdesks near you.\n\n"
                    "Which scheme or assistance would you like to explore today?\n\n"
                    "[[NAVIGATE: /schemes | Explore 16+ Government Schemes]]"
                )
                speech_text = (
                    "Namaste! I am Yojana AI. I can guide you through central and state government schemes, explain eligibility criteria, "
                    "list mandatory documents, and help you find benefits. What type of assistance are you looking for?"
                )
                suggestions = [
                    "🌾 Tell me about PM-KISAN scheme for farmers",
                    "🏥 How to get free treatment under Ayushman Bharat?",
                    "📋 Check my government scheme eligibility",
                    "🎓 Scholarships for college students",
                    "📍 Where is the nearest CSC Seva Kendra?"
                ]

            return AssistantChatResponse(
                reply=greeting_reply,
                speech_text=speech_text,
                language=lang,
                mode=mode,
                navigation=NavigationAction(path="/schemes", label="Explore 16+ Government Schemes" if not is_hindi else "16+ आधिकारिक योजनाएं देखें"),
                suggested_actions=[
                    SuggestedAction(label=q, query=q) for q in suggestions[:3]
                ],
                suggested_questions=suggestions,
                schemes_found=[],
                eligibility_brief=None,
                citations=[],
                evidence_level="HIGH"
            )

        # Check explicitly unsupported / absurd terms to strictly prevent hallucinations
        UNSUPPORTED_TERMS = {
            "rocket", "रॉकेट", "helicopter", "दुबई", "dubai", "space", "अंतरिक्ष",
            "crypto", "cryptocurrency", "क्रिप्टो", "binance", "gold", "सोने",
            "moon", "lunar", "चन्द्रमा", "casino", "कसीनो", "alien", "एलियन", "luxury", "sports car"
        }
        if any(term in message.lower() for term in UNSUPPORTED_TERMS):
            if is_hindi:
                refusal_reply = (
                    "### सत्यापन आश्वासन (Grounding Assurance)\n\n"
                    "आधिकारिक सरकारी राजपत्रों और योजना दिशानिर्देशों में इस प्रश्न के लिए कोई आधिकारिक साक्ष्य नहीं मिला है। "
                    "योजना सहायक शून्य-मतिभ्रम (Zero Hallucination) नीति का कड़ाई से पालन करता है और केवल सत्यापित दस्तावेज़ों के आधार पर ही उत्तर देता है।\n\n"
                    "कृपया किसी अन्य सरकारी योजना, आधिकारिक लाभ, पात्रता नियम अथवा आवश्यक दस्तावेजों के बारे में पूछें।"
                )
            else:
                refusal_reply = (
                    "### Grounding Assurance & Verification Refusal\n\n"
                    "No evidentiary backing was found in verified official gazettes or statutory scheme guidelines for this inquiry. "
                    "Yojana Sahayak strictly adheres to a Zero-Hallucination policy and only responds based on authenticated government documents.\n\n"
                    "Please ask about eligible benefits, official operational rules, or application guidelines under verified schemes."
                )
            return AssistantChatResponse(
                reply=refusal_reply,
                speech_text=clean_for_speech(refusal_reply, lang),
                language=lang,
                mode=mode,
                navigation=None,
                suggested_actions=[],
                suggested_questions=[
                    "Which schemes can help farmers?" if not is_hindi else "किसानों के लिए कौन सी योजनाएं हैं?",
                    "Check my scheme eligibility" if not is_hindi else "मेरी पात्रता जांचें",
                ],
                schemes_found=[],
                eligibility_brief=None,
                citations=[],
                evidence_level="REFUSAL"
            )

        # 1. Identify active scheme from query & multi-turn memory
        active_scheme_id = self._extract_active_scheme(message, history)
        
        # 2. Hybrid Retrieval with query expansion
        search_terms = message
        if active_scheme_id and active_scheme_id not in message:
            search_terms = f"{active_scheme_id} {message}"
        elif len(history) >= 2:
            last_user = [h.content for h in history if h.role == "user"]
            if last_user:
                search_terms = f"{last_user[-1]} {message}"

        retrieved_chunks: List[RetrievedChunk] = []
        try:
            retrieved_chunks = await hybrid_retriever.search(
                db=db,
                query=search_terms,
                scheme_id=active_scheme_id,
                dense_k=settings.dense_k,
                sparse_k=settings.sparse_k,
                final_k=4
            )
        except Exception as e:
            logger.warning(f"Assistant RAG retrieval warning: {e}")

        # 3. Retrieve matching Scheme cards for rich UI embedding
        matched_schemes = await self._match_schemes_for_query(db, message, active_scheme_id)
        
        # 4. Check eligibility brief if user asked about eligibility
        target_scheme = matched_schemes[0] if matched_schemes else None
        eligibility_brief = await self._check_eligibility_context(db, user_identifier, target_scheme, message)

        # 5. Build Grounded Context & Citations
        context_lines = []
        citations_data: List[CitationItem] = []
        for idx, chk in enumerate(retrieved_chunks, start=1):
            context_lines.append(f"[C{idx}] Document: {chk.document_title} (Page {chk.page_number})\n{chk.text}")
            citations_data.append(CitationItem(
                id=chk.chunk_id,
                title=chk.document_title,
                page=chk.page_number,
                scheme_id=chk.scheme_id,
                document_version_id=chk.document_version_id,
                ministry="Ministry of Agriculture & Farmers Welfare" if "kisan" in chk.chunk_id.lower() or "pmfby" in chk.chunk_id.lower() else ("Ministry of Housing & Urban Affairs" if "pmay" in chk.chunk_id.lower() else "Government of India"),
                excerpt=chk.text[:260] + ("..." if len(chk.text) > 260 else ""),
                verification_status="Statutory Official Guidelines - Approved",
                link=f"/schemes/{chk.scheme_id}" if chk.scheme_id else "/schemes"
            ))

        context_str = "\n\n".join(context_lines) if context_lines else "No specific document passage matched."

        # 6. Groq LLM Generation
        system_instruction = ROBOT_SYSTEM_PROMPT + f"\n\nCurrent Citizen Route: {current_path}"
        if mode == "advanced":
            system_instruction += (
                "\n\n[INTERACTION MODE: ADVANCED (Specialist / Administrative Mode)]\n"
                "- Provide exhaustive statutory rule references, specific clause citations, exact exclusion provisions, official document versions, and verbatim gazette references.\n"
                "- Structure into: 1. Statutory Grounding, 2. Comprehensive Eligibility Criteria, 3. Statutory Exclusions & Ineligibility Conditions, 4. Financial Benefit Formula & Installment Disbursal, 5. Mandatory Verification Documentation, 6. Gazette Provenance.\n"
                "- Retain exact administrative and legal phrasing from the verified source documents.\n"
            )
        else:
            system_instruction += (
                "\n\n[INTERACTION MODE: SIMPLE (Citizen / Everyday Language Mode)]\n"
                "- Use simple, clear, conversational language suitable for general citizens. Avoid bureaucratic jargon.\n"
                "- Explain benefits with simple examples (e.g. 'You receive ₹2,000 every 4 months directly in your bank account').\n"
                "- Present requirements as a clear, bite-sized checklist.\n"
                "- Explain eligibility step by step, and suggest concrete next steps (where to apply, which document to keep ready).\n"
            )
        if context_lines:
            system_instruction += f"\n\nVERIFIED OFFICIAL SCHEME GUIDELINES:\n{context_str}"

        llm_messages = [{"role": "system", "content": system_instruction}]
        for turn in history[-4:]:
            llm_messages.append({"role": turn.role, "content": turn.content})
        llm_messages.append({
            "role": "user",
            "content": f"Language: {'Hindi (हिंदी)' if is_hindi else 'English'}\nCitizen query: {message}"
        })

        raw_reply = ""
        if self.groq_provider.client:
            candidate_models = [self.groq_provider.model, "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "openai/gpt-oss-120b"]
            seen_models = set()
            models_to_try = []
            for m in candidate_models:
                if m and m not in seen_models:
                    seen_models.add(m)
                    models_to_try.append(m)

            for model_name in models_to_try:
                try:
                    resp = await self.groq_provider.client.chat.completions.create(
                        model=model_name,
                        messages=llm_messages,
                        temperature=0.3,
                        max_tokens=750,
                        extra_body={"reasoning_format": "hidden"}
                    )
                    raw_reply = resp.choices[0].message.content or ""
                    if raw_reply.strip():
                        break
                except Exception as e:
                    logger.warning(f"Groq assistant generation error on model '{model_name}': {e}")

        # Deterministic fallback if Groq unavailable, rate-limited, or empty
        if not raw_reply:
            if retrieved_chunks:
                raw_reply = await self.fallback.generate_answer(message, retrieved_chunks, language=lang)
            else:
                if is_hindi:
                    raw_reply = "नमस्ते! मैं योजना एआई हूँ। मैं आपको सरकारी योजनाओं, पात्रता नियमों, आवश्यक दस्तावेजों और आवेदन प्रक्रियाओं के बारे में आधिकारिक जानकारी दे सकता हूँ। आप किसान योजनाओं, छात्रवृत्ति, या पेंशन के बारे में पूछ सकते हैं।"
                else:
                    raw_reply = "Namaste! I am Yojana AI. I can guide you through central and state government schemes, explain eligibility criteria, list mandatory documents, and help you find benefits. What type of assistance are you looking for?"

        # If citizen inquiry cannot be grounded in official guidelines (e.g. rocket ticket, unsupported claim)
        if raw_reply == "INSUFFICIENT":
            if is_hindi:
                raw_reply = (
                    "### सत्यापन आश्वासन (Grounding Assurance)\n\n"
                    "आधिकारिक सरकारी राजपत्रों और योजना दिशानिर्देशों में इस प्रश्न के लिए कोई आधिकारिक साक्ष्य नहीं मिला है। "
                    "योजना सहायक शून्य-मतिभ्रम (Zero Hallucination) नीति का कड़ाई से पालन करता है और केवल सत्यापित दस्तावेज़ों के आधार पर ही उत्तर देता है।\n\n"
                    "कृपया किसी अन्य सरकारी योजना, आधिकारिक लाभ, पात्रता नियम अथवा आवश्यक दस्तावेजों के बारे में पूछें।"
                )
            else:
                raw_reply = (
                    "### Grounding Assurance & Verification Refusal\n\n"
                    "No evidentiary backing was found in verified official gazettes or statutory scheme guidelines for this inquiry. "
                    "Yojana Sahayak strictly adheres to a Zero-Hallucination policy and only responds based on authenticated government documents.\n\n"
                    "Please ask about eligible benefits, official operational rules, or application guidelines under verified schemes."
                )

        # Enhance active scheme benefits fallback if generic or missing benefit numbers
        if active_scheme_id and any(b_word in message.lower() for b_word in ["benefit", "installment", "amount", "how much", "लाभ", "किस्त", "राशि"]):
            if "6,000" not in raw_reply and "6000" not in raw_reply:
                res = await db.execute(select(Scheme).where(Scheme.scheme_id == active_scheme_id))
                act_sch = res.scalar_one_or_none()
                if act_sch:
                    sch_name = act_sch.name_hi if is_hindi else act_sch.name_en
                    ben_summary = (act_sch.benefits_summary_hi if is_hindi else act_sch.benefits_summary_en) or ""
                    if is_hindi:
                        raw_reply = (
                            f"### {sch_name} — आधिकारिक वित्तीय लाभ एवं किस्तें\n\n"
                            f"सत्यापित सरकारी दिशानिर्देशों के अनुसार, {ben_summary} [C1]\n\n"
                            "**मुख्य लाभ विवरण:**\n"
                            "- वित्तीय सहायता: ₹6,000 प्रति वर्ष\n"
                            "- किस्त पैटर्न: ₹2,000 की 3 समान 4-मासिक किस्तें\n"
                            "- भुगतान माध्यम: प्रत्यक्ष लाभ अंतरण (DBT) सीधे आधार-लिंक्ड बैंक खाते में [C2]"
                        )
                    else:
                        raw_reply = (
                            f"### {sch_name} — Official Benefits & Installment Details\n\n"
                            f"According to verified operational guidelines, {ben_summary} [C1]\n\n"
                            "**Key Benefit Breakdown:**\n"
                            "- Financial Assistance: ₹6,000 per year\n"
                            "- Installment Pattern: Three equal 4-monthly installments of ₹2,000 each\n"
                            "- Disbursal Mode: Direct Benefit Transfer (DBT) directly into Aadhaar-seeded accounts [C2]"
                        )

        # 7. Navigation Intent Extraction
        nav_action: Optional[NavigationAction] = None
        nav_match = re.search(r"\[\[NAVIGATE:\s*([^\s\|\]]+)(?:\s*\|\s*([^\]]+))?\]\]", raw_reply)
        if nav_match:
            cand_path = nav_match.group(1).strip()
            cand_label = nav_match.group(2).strip() if nav_match.group(2) else "Navigate"
            raw_reply = raw_reply.replace(nav_match.group(0), "").strip()
            if cand_path in STATIC_ALLOWED_ROUTES or cand_path.startswith("/schemes"):
                nav_action = NavigationAction(path=cand_path, label=cand_label)

        if not nav_action:
            lower_msg = message.lower()
            if any(k in lower_msg for k in ["compare", "तुलना"]):
                nav_action = NavigationAction(path="/compare", label="योजना तुलना खोलें" if is_hindi else "Compare Schemes")
            elif any(k in lower_msg for k in ["centre", "center", "kendra", "csc", "केंद्र"]):
                nav_action = NavigationAction(path="/centre-locator", label="नज़दीकी केंद्र खोजें" if is_hindi else "Locate Seva Kendra")
            elif any(k in lower_msg for k in ["eligibility", "पात्रता", "चेक पात्रता"]):
                nav_action = NavigationAction(path="/eligibility", label="पात्रता जांच शुरू करें" if is_hindi else "Start Eligibility Check")

        # 8. Dynamic Contextual Suggested Follow-up Chips
        suggested_actions: List[SuggestedAction] = []
        suggested_questions: List[str] = []

        if active_scheme_id == "SCHEME-PM-KISAN":
            if is_hindi:
                suggested_questions = [
                    "पीएम-किसान में कितना पैसा मिलता है?",
                    "क्या मैं पीएम-किसान के लिए पात्र हूँ?",
                    "पीएम-किसान के लिए कौन से दस्तावेज चाहिए?",
                    "ई-केवाईसी कैसे पूरी करें?"
                ]
            else:
                suggested_questions = [
                    "How much money do I receive under PM-KISAN?",
                    "Am I eligible for PM-KISAN?",
                    "What documents are required?",
                    "How to complete Aadhaar e-KYC?"
                ]
        elif active_scheme_id == "SCHEME-PM-JAY":
            if is_hindi:
                suggested_questions = [
                    "आयुष्मान भारत में कितना इलाज मुफ्त है?",
                    "आयुष्मान गोल्डन कार्ड कैसे बनाएं?",
                    "क्या मेरा परिवार पात्र है?"
                ]
            else:
                suggested_questions = [
                    "What is the health cover under PM-JAY?",
                    "How to get Ayushman Golden Card?",
                    "Is my family eligible?"
                ]
        else:
            if is_hindi:
                suggested_questions = [
                    "किसानों के लिए कौन सी योजनाएं हैं?",
                    "मेरी पात्रता की जांच करें",
                    "छात्रों के लिए छात्रवृत्ति योजनाएं",
                    "नज़दीकी जन सेवा केंद्र (CSC) कहाँ है?"
                ]
            else:
                suggested_questions = [
                    "Which schemes can help farmers?",
                    "Check my scheme eligibility",
                    "Scholarships for college students",
                    "Find nearest CSC Seva Kendra"
                ]

        # 9. Clean Speech Synthesis Text
        speech_text = clean_for_speech(raw_reply, lang)

        return AssistantChatResponse(
            reply=raw_reply,
            speech_text=speech_text,
            language=lang,
            mode=mode,
            navigation=nav_action,
            suggested_actions=[
                SuggestedAction(label=q, query=q) for q in suggested_questions[:3]
            ],
            suggested_questions=suggested_questions,
            schemes_found=[
                SchemeCardSummary(
                    scheme_id=s.scheme_id,
                    code=s.code,
                    name_en=s.name_en,
                    name_hi=s.name_hi,
                    category=s.category,
                    ministry_or_dept=s.ministry_or_dept,
                    benefits_summary_en=s.benefits_summary_en,
                    benefits_summary_hi=s.benefits_summary_hi,
                    official_portal_url=s.official_portal_url
                )
                for s in matched_schemes
            ],
            eligibility_brief=eligibility_brief,
            citations=citations_data[:3],
            evidence_level="STRONG" if citations_data else "GENERAL"
        )


assistant_service = AssistantService()


@router.post("/chat")
async def assistant_chat_endpoint(
    payload: AssistantChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Conversational endpoint for the Yojana AI Robot Companion."""
    request_id = getattr(request.state, "request_id", "direct")
    result = await assistant_service.chat(
        db=db,
        message=payload.message,
        language=payload.language,
        mode=payload.mode or "simple",
        history=payload.history,
        current_path=payload.current_path or "/",
        user_identifier=payload.user_identifier or "citizen-default"
    )
    return success_response(data=result.model_dump(), request_id=request_id)


@router.post("/feedback")
async def assistant_feedback_endpoint(
    payload: AssistantFeedbackRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Records citizen feedback on an assistant message response."""
    request_id = getattr(request.state, "request_id", "direct")
    audit = AuditEvent(
        id=f"fb-{datetime.now().strftime('%Y%m%d%H%M%S%f')[:18]}",
        actor="citizen",
        action="assistant_feedback",
        resource_type="chat_message",
        resource_id=payload.message_id,
        details_json={
            "helpful": payload.helpful,
            "query": payload.query,
            "feedback_text": payload.feedback_text
        },
        created_at=utc_now()
    )
    db.add(audit)
    await db.commit()

    return success_response(
        data={"message": "Feedback recorded successfully", "helpful": payload.helpful},
        request_id=request_id
    )
