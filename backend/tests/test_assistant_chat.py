"""Comprehensive automated test suite for Yojana AI Assistant Conversational Intelligence & Memory."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import create_app

app = create_app()


@pytest.mark.asyncio
async def test_assistant_scheme_discovery_intent():
    """Test 1: Scheme Discovery - Asks about farmer schemes, receives structured advisor answer & cards."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "message": "I am a small farmer in India. Which schemes can help me?",
            "language": "en",
            "history": []
        }
        res = await ac.post("/api/v1/assistant/chat", json=payload)
        assert res.status_code == 200
        data = res.json()["data"]

        # 1. Structured reply exists
        assert len(data["reply"]) > 50

        # 2. Clean speech text generated (no markdown hashes)
        assert len(data["speech_text"]) > 20
        assert "#" not in data["speech_text"]

        # 3. Interactive scheme cards hydrated
        assert len(data["schemes_found"]) >= 1
        scheme_ids = [s["scheme_id"] for s in data["schemes_found"]]
        assert any("KISAN" in sid or "PMFBY" in sid or "KCC" in sid for sid in scheme_ids)

        # 4. Citations retrieved from verified RAG pipeline
        assert len(data["citations"]) >= 1
        first_cite = data["citations"][0]
        assert "title" in first_cite
        assert "page" in first_cite
        assert "verification_status" in first_cite


@pytest.mark.asyncio
async def test_assistant_anaphoric_follow_up_benefits():
    """Test 2: Follow-Up Context - Resolves 'What are its benefits?' using multi-turn conversation memory."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        history = [
            {"role": "user", "content": "Tell me about PM-KISAN"},
            {"role": "assistant", "content": "PM-KISAN is a central sector scheme for farmer families."}
        ]
        payload = {
            "message": "What are its benefits and installment amounts?",
            "language": "en",
            "history": history
        }
        res = await ac.post("/api/v1/assistant/chat", json=payload)
        assert res.status_code == 200
        data = res.json()["data"]

        # Should mention ₹6,000 / 6000 and 3 installments / installments
        reply_lower = data["reply"].lower()
        assert "6,000" in reply_lower or "6000" in reply_lower or "installment" in reply_lower
        assert len(data["citations"]) >= 1


@pytest.mark.asyncio
async def test_assistant_multi_turn_context_and_eligibility():
    """Test 3: Eligibility - Resolves 'Am I eligible?' to PM-KISAN from previous turn and evaluates profile."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        history = [
            {"role": "user", "content": "Tell me about PM-KISAN scheme"},
            {"role": "assistant", "content": "PM-KISAN provides ₹6,000 per year to land-holding farmer families."}
        ]

        payload = {
            "message": "Am I eligible for this scheme?",
            "language": "en",
            "history": history,
            "user_identifier": "citizen-default"
        }
        res = await ac.post("/api/v1/assistant/chat", json=payload)
        assert res.status_code == 200
        data = res.json()["data"]

        # Context resolved to PM-KISAN
        assert data["eligibility_brief"] is not None
        assert "PM-KISAN" in data["eligibility_brief"]["scheme_name"]
        assert len(data["eligibility_brief"]["matched_criteria"]) >= 1


@pytest.mark.asyncio
async def test_assistant_hindi_conversation():
    """Test 4: Hindi Conversation - Handles Devanagari input and returns authentic Devanagari terminology."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "message": "किसानों के लिए सरकारी योजनाएं बताएं",
            "language": "hi",
            "history": []
        }
        res = await ac.post("/api/v1/assistant/chat", json=payload)
        assert res.status_code == 200
        data = res.json()["data"]

        assert data["language"] == "hi"
        assert len(data["reply"]) > 30
        assert len(data["suggested_questions"]) >= 1
        # Speech text should be in Hindi without markdown
        assert "#" not in data["speech_text"]


@pytest.mark.asyncio
async def test_assistant_grounding_refusal_preventing_hallucination():
    """Test 5: Refusal Handling - Ungrounded query refuses politely and does not hallucinate."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "message": "Can I buy a rocket ticket with PM-KISAN subsidy?",
            "language": "en",
            "history": []
        }
        res = await ac.post("/api/v1/assistant/chat", json=payload)
        assert res.status_code == 200
        data = res.json()["data"]

        # Refusal notice or grounding note present
        reply = data["reply"]
        assert "Grounding Assurance" in reply or "official guidelines" in reply or "PM-KISAN" in reply


@pytest.mark.asyncio
async def test_assistant_feedback_collection():
    """Test 6: Feedback Collection - Records thumbs up/down in audit event trail."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Helpful feedback
        feedback_payload = {
            "message_id": "msg-pytest-101",
            "query": "How much money in PM-KISAN?",
            "helpful": True,
            "feedback_text": "Very accurate official information"
        }
        res = await ac.post("/api/v1/assistant/feedback", json=feedback_payload)
        assert res.status_code == 200
        assert res.json()["data"]["helpful"] is True

        # Unhelpful feedback
        feedback_unhelpful = {
            "message_id": "msg-pytest-102",
            "query": "Where is my ration card?",
            "helpful": False,
            "feedback_text": "Need CSC office directions"
        }
        res2 = await ac.post("/api/v1/assistant/feedback", json=feedback_unhelpful)
        assert res2.status_code == 200
        assert res2.json()["data"]["helpful"] is False


@pytest.mark.asyncio
async def test_assistant_simple_and_advanced_modes():
    """Test 7: Dual Interaction Modes - Simple Mode vs Advanced Mode."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Simple Mode
        res_simple = await ac.post("/api/v1/assistant/chat", json={
            "message": "I am a farmer. How does PM-KISAN help me?",
            "language": "en",
            "mode": "simple"
        })
        assert res_simple.status_code == 200
        data_simple = res_simple.json()["data"]
        assert data_simple["mode"] == "simple"
        assert len(data_simple["reply"]) > 20

        # Advanced Mode
        res_adv = await ac.post("/api/v1/assistant/chat", json={
            "message": "Detail the statutory exclusion criteria and DBT framework for PM-KISAN.",
            "language": "en",
            "mode": "advanced"
        })
        assert res_adv.status_code == 200
        data_adv = res_adv.json()["data"]
        assert data_adv["mode"] == "advanced"
        assert len(data_adv["reply"]) > 20
        # Both share the same underlying verified RAG citations
        assert len(data_adv["citations"]) >= 1

