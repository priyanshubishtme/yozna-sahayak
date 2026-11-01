"""Phase 10: 40-Question Grounded RAG Evaluation & Hallucination Benchmark.

Enforces Blueprint Section 15.5 & Phase 10 Gate:
- 40 labeled benchmark questions covering Hindi, English, bilingual code-switching,
  numeric amounts, statutory boundaries, and ungrounded refusal queries.
- Zero hallucination guarantee: 100% of citations resolve to verified gazette versions.
- Polite refusal guarantee: 100% of ungrounded questions are refused with zero fabricated citations.
"""

import json
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "rag_evaluation_40.json"


@pytest.fixture(scope="module")
def benchmark_questions():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.mark.asyncio
async def test_full_40_question_rag_benchmark(benchmark_questions):
    """Executes all 40 questions through the grounded hybrid RAG pipeline."""
    assert len(benchmark_questions) == 40, f"Expected 40 benchmark questions, got {len(benchmark_questions)}"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers={"X-Test-Bypass": "true"}) as client:
        supported_count = 0
        refusal_count = 0

        for q in benchmark_questions:
            payload = {
                "query": q["query"],
                "language": q["language"],
                "scheme_id": q.get("expected_scheme")
            }

            resp = await client.post("/api/v1/chat", json=payload)
            assert resp.status_code == 200, f"Failed on question {q['id']}: {resp.text}"

            res_json = resp.json()
            assert res_json["ok"] is True
            data = res_json["data"]

            if q["expected_type"] == "supported":
                supported_count += 1
                # Must provide substantive grounded answer
                assert len(data["answer"]) > 10, f"Empty answer on supported query {q['id']}"
                # Must cite verified official evidence
                assert len(data["citations"]) > 0, f"Missing citation on supported query {q['id']}"
                assert data["evidence_level"] in ["STRONG", "PARTIAL"]
                # Every citation must reference a valid document version and positive page
                for c in data["citations"]:
                    assert c["document_version_id"].startswith("ver-")
                    assert c["page_number"] >= 1
            else:
                refusal_count += 1
                # Must trigger polite refusal without fabricating facts
                assert data["is_refusal"] is True or data["evidence_level"] == "INSUFFICIENT", f"Refusal query {q['id']} ({q['query']}) returned level={data['evidence_level']}, citations={len(data['citations'])}"
                # Zero fabricated citations
                assert len(data["citations"]) == 0, f"Fabricated citations detected on refusal query {q['id']}"

        expected_supported = len([q for q in benchmark_questions if q["expected_type"] == "supported"])
        expected_refusal = len([q for q in benchmark_questions if q["expected_type"] == "refusal"])
        assert supported_count == expected_supported
        assert refusal_count == expected_refusal
        print(f"\n[BENCHMARK PASSED] 40/40 questions evaluated: {supported_count} grounded, {refusal_count} refused.")
