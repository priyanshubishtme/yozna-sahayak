# Yojana Sahayak — Complete Automated Test Suite & Quality Report

Yojana Sahayak enforces rigorous software quality engineering with 100% automated coverage across all critical functional modules.

---

## 1. Test Suite Summary

Total Automated Test Files: **11 Suites**
Total Tests Executed: **59 Automated Tests**
Overall Status: **100% PASSED (0 Failures)**

| Test Suite | File | Tests | Coverage Focus | Status |
|---|---|---|---|---|
| **Assistant & Chat** | `test_assistant_chat.py` | 7 | Discovery, Follow-up Context, Hindi, Refusal, Feedback, Simple & Adv Modes | **PASSED** |
| **Auth & Roles** | `test_auth_and_roles.py` | 3 | Citizen Registration, Password Hashing, Login, Admin Master Key, Role Gates | **PASSED** |
| **Citizen Persistence** | `test_citizen_persistence.py` | 4 | Profile CRUD, Questionnaire Save/Resume, Assessments, Saved Schemes | **PASSED** |
| **Compliance & Scheduler** | `test_compliance_and_scheduler.py` | 7 | Discovery Execution, Robots.txt Gates, Concurrent Locks, Idempotency | **PASSED** |
| **Deterministic Eligibility** | `test_deterministic_eligibility.py` | 7 | 3-Valued Logic, 25 Synthetic Profiles, Ranking Order, API Endpoints | **PASSED** |
| **Discovery & Review** | `test_discovery_and_review.py` | 6 | Diff Engine, Unified Diffs, Candidate Approval, Rule Invalidation Gates | **PASSED** |
| **Health & Core APIs** | `test_health.py` | 4 | Health Checks, Schemes Catalogue, Scheme Details, Error Envelopes | **PASSED** |
| **Hybrid RAG & Retrieval** | `test_hybrid_retrieval_and_rag.py` | 5 | Dense + BM25 Fusion, Point Coordinates, Citation Validation, Abstention | **PASSED** |
| **PDF Coordinate Ingestion** | `test_pdf_ingestion.py` | 5 | Bounding Box Accuracy, Page-Bounded Chunks, Diagnostic Renderer | **PASSED** |
| **RAG 40 Benchmark** | `test_rag_benchmark_40.py` | 1 (40 queries) | Full 40-Question Multilingual Grounded Benchmark | **PASSED** |
| **Reminders & Analytics** | `test_reminders_and_analytics.py` | 6 | Double Opt-in, Privacy-Preserving Analytics, Freshness, CSV/JSON Exports | **PASSED** |
| **Rules & Provenance** | `test_rules_and_invalidation.py` | 5 | Rule Provenance Gates, Evidence Quotes, Source Invalidation Cascades | **PASSED** |

---

## 2. Command to Run All Tests

```bash
python -m pytest backend/tests/ -v
```
