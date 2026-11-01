# Yojana Sahayak: Implementation Status

Tracking implementation progress across the 10-phase roadmap based on Technical Blueprint V2 (INNOVISTA Problem Statement 03).
Preserving full product scope with zero feature deletion.

---

## Roadmap Overview & Status

| Phase | Description | Original Blueprint Phases | Status | Gate Checklist |
|---|---|---|---|---|
| **Phase 1** | **Foundation and Design System** | Phases 0 & 1 | **COMPLETED** | [x] Backend starts, [x] Frontend starts, [x] DB migrates from empty, [x] No secrets committed, [x] All public, citizen & admin routes navigable |
| **Phase 2** | **Source Registry, Compliance Gate & Scheduler** | Phases 2 & 3 | **COMPLETED** | [x] Prohibited/pending source cannot run automatically, [x] Scheduler runs once, [x] Jobs idempotent, [x] Failures observable |
| **Phase 3** | **Discovery, Fetching & Admin Review Console** | Phases 4 & 5 | **COMPLETED** | [x] New/changed/unchanged classified correctly on fixtures, [x] No candidate public/searchable before approval |
| **Phase 4** | **PDF Ingestion & Coordinate Extraction** | Phase 6 | **COMPLETED** | [x] Every chunk keeps page and boxes, [x] Spot-checks pass, [x] One single shared ingestion path |
| **Phase 5** | **Structured Schemes & Eligibility Rule Review** | Phase 7 | **COMPLETED** | [x] Every active rule has verified quote & page, [x] Source change disables rules until re-approved, [x] 13 initial scheme records |
| **Phase 6** | **Hybrid Retrieval & Groq RAG Chat** | Phases 8 & 9 | **COMPLETED** | [x] Only current verified versions retrieved, [x] Zero hallucinated citation IDs, [x] Unsupported questions refused, [x] Final answer validated |
| **Phase 7** | **Deterministic Eligibility & Ranking** | Phase 10 | **COMPLETED** | [x] 25 profiles match expected outcomes, [x] Zero needs_review rules produce output, [x] Three-valued logic & explainability |
| **Phase 8** | **Citizen Application, PDF Evidence Viewer & 3D Experience** | Phase 11 | **COMPLETED** | [x] End-to-end journeys pass on mobile/desktop, [x] Source chips open exact PDF highlight boxes, [x] 3D landing page responsive |
| **Phase 9** | **PWA, Offline, Voice, My Schemes & Notifications** | Phases 12 & 13 | **COMPLETED** | [x] Saved schemes open offline, [x] Chat/eligibility network-only, [x] Voice text fallback, [x] Verified email unsubscribe works |
| **Phase 10** | **Evaluation, Security, Deployment & Demo** | Phase 14 | **COMPLETED** | [x] Full test suites pass, [x] Security & dependency review, [x] Rate limits active, [x] Production deployment scripts verified |

---

## Phase 10 Detail Checklist (Evaluation, Security, Deployment & Demo) — Passed

- [x] **40-Question RAG Benchmark Fixture Suite (`backend/tests/fixtures/rag_evaluation_40.json`)**:
  - 40 challenging questions across 6 distinct evaluation categories:
    - `english_numeric`: Specific grant amounts, installments, income ceilings across PM-KISAN, PMAY-G, PM-JAY, and CSSS.
    - `hindi_over_english`: Hindi and Devanagari questions querying English gazettes, verifying cross-lingual BM25 + dense retrieval.
    - `boundary_check`: Age limits, Aadhaar mandates, income tax disqualifications, pre-existing conditions coverage.
    - `bilingual_mixed`: Hinglish queries with transliterated terms.
    - `unsupported_refusal`: 9 out-of-scope / absurd queries (cryptocurrency, Dubai helicopter, moon property, casino gambling) asserting polite refusal.
- [x] **Automated RAG Benchmark Runner (`backend/tests/test_rag_benchmark_40.py`)**:
  - Evaluates all 40 questions against the live RAG chat pipeline.
  - Verifies zero fabricated citations on refusals, and 100% valid document version and page coordinates on supported questions.
  - Passes 40/40 questions deterministically: 31 grounded with citations, 9 refused politely.
- [x] **Token Bucket Sliding Window Rate Limiting (`backend/app/core/rate_limit.py`)**:
  - Middleware enforcing sliding-window request limits (120 req/min default, 60 req/min for AI chat and eligibility).
  - Emits HTTP 429 Too Many Requests with `Retry-After` header when limits are exceeded.
  - Automatic test client bypass (`X-Test-Bypass` header and `PYTEST_CURRENT_TEST` env check).
- [x] **Dedicated Single-Instance Scheduler Runner (`backend/app/scheduler/run.py`)**:
  - Independent daemon entry point with process lock file (`SchedulerProcessLock`), signal handlers (`SIGINT`, `SIGTERM`), and periodic source discovery loop.
- [x] **Automated Content & DB Backup / Restore Scripts (`backend/scripts/backup.py`, `backend/scripts/restore.py`)**:
  - Creates timestamped `.tar.gz` archive containing SQLite database, content-addressable storage (`data/fetched/`, `data/pdfs/`), and SHA-256 integrity manifest.
  - Restore script validates cryptographic hash before re-inflating state.
- [x] **Production Deployment Manifests (`render.yaml`, `apps/web/netlify.toml`)**:
  - `render.yaml`: Blueprint configuring FastAPI web service and background scheduler worker with persistent disk.
  - `apps/web/netlify.toml`: Production PWA headers, SPA rewrite rules, and strict CSP headers.
- [x] **Hackathon Pitch & Live Demo Script (`DEMO_SCRIPT.md`)**:
  - Step-by-step 3-minute hackathon pitch narrative covering the problem, the 3D civic visual, deterministic eligibility, grounded RAG with PDF coordinate visualizer, and offline PWA.

---

## Phase 9 Detail Checklist (PWA, Offline, Voice, My Schemes & Notifications) — Passed

- [x] **Progressive Web App Manifest & Service Worker (`apps/web/public/manifest.json`, `apps/web/public/sw.js`)**:
  - Standalone PWA manifest with tricolor theme color (`#FF9933`), app shortcuts, and civic icons.
  - Service Worker implementation:
    - App shell and static asset caching (cache-first strategy).
    - Network-first SPA navigation fallback to `index.html`.
    - Network-only strategy for live AI RAG (`/api/v1/chat`) and eligibility evaluation (`/api/v1/eligibility/evaluate`), returning structured offline JSON errors to prevent hallucinated offline answers.
- [x] **Client-Side Offline IndexedDB (`apps/web/src/utils/offlineDb.ts`)**:
  - Implements browser IndexedDB store `yojana_sahayak_offline` with object stores for `saved_schemes` and `checklists`.
  - Seamless offline read/write with instant synchronization to localStorage as secondary backup.
- [x] **Offline-Capable Saved Schemes & Checklist Screen (`apps/web/src/pages/citizen/SavedSchemesPage.tsx`)**:
  - Real-time online/offline indicator badge ("Offline Mode Active - Data Saved Locally").
  - Persistent interactive document checklist tracking application readiness percentage.
  - Scheme remove, view details, and external portal navigation.
- [x] **Bilingual Voice Assistant (`apps/web/src/components/VoiceAssistant.tsx`)**:
  - Built with the Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`).
  - Supports Hindi (`hi-IN`) and Indian English (`en-IN`) speech recognition.
  - Animated live audio waveform visualizer during speech capture.
  - Full keyboard text input fallback when speech recognition is unavailable or denied.
- [x] **Verified Email Reminder & Double Opt-in Service (`backend/app/api/v1/reminders.py`)**:
  - Double opt-in verification token generation (`POST /api/v1/reminders/subscribe`).
  - Verification endpoint (`GET /api/v1/reminders/verify`).
  - Unsubscribe endpoint (`POST /api/v1/reminders/unsubscribe` and `GET /api/v1/reminders/unsubscribe`).
  - Strictly rejects reminder subscriptions for schemes without verified official deadline dates.
- [x] **Privacy-Preserving Telemetry & Analytics (`backend/app/api/v1/analytics.py`)**:
  - Zero PII policy: strictly no IP addresses, phone numbers, citizen names, or persistent cookies collected or logged.
  - Aggregates anonymous platform telemetry: total inquiries, top categories, eligibility queries, and verification rates.
- [x] **In-Chat SpeechSynthesis (TTS) & Microphone Input (`apps/web/src/pages/citizen/ChatPage.tsx`)**:
  - Browser-native speech output (`window.speechSynthesis`) on every assistant response in Hindi (`hi-IN`) and English (`en-IN`), automatically stripping citation brackets for fluid speech.
  - Microphone input button in chat composer for hands-free queries with automatic Web Speech recognition.
- [x] **Global Offline Resilience Banner & PWA Install Button (`apps/web/src/components/common/Navbar.tsx`)**:
  - Real-time `online`/`offline` window event monitoring displaying an amber banner across the entire application when disconnected, clearly communicating that Saved Schemes & Checklists are accessible offline while live AI chat and eligibility evaluation require internet.
  - Listens to `beforeinstallprompt` event and renders an "Install App / ऐप इंस्टॉल" pill with native prompt trigger.
- [x] **Verified Deadline Reminder Subscription Modal (`apps/web/src/pages/citizen/CitizenSchemeDetailPage.tsx`)**:
  - Interactive "Deadline Alerts / समय-सीमा अनुस्मारक" button and modal connected to `POST /api/v1/reminders/subscribe`.
  - Enforces strict Zero-PII privacy standards and displays double opt-in confirmation feedback.
- [x] **Admin Source Freshness & Privacy Telemetry Dashboard (`apps/web/src/pages/admin/AdminFreshnessPage.tsx`)**:
  - Live 30-day source staleness tracker, approved portal counts, and aggregate anonymous telemetry.
  - 1-Click JSON/CSV compliance audit export directly in the browser.
- [x] **Source Freshness & Audit Export APIs (`backend/app/api/v1/freshness.py`, `backend/app/api/v1/audit_export.py`)**:
  - `GET /api/v1/admin/freshness`: Live source staleness tracker, highlighting portals pending review or overdue for sync.
  - `GET /api/v1/admin/audit/export`: Full compliance audit trail export supporting JSON and CSV formats.

---

## Phase 8 Detail Checklist (Citizen Application, PDF Evidence Viewer & 3D Experience) — Passed

- [x] **Interactive 3D Civic Experience Hero Visual (`apps/web/src/components/CivicEmblem3D.tsx`)**:
  - Implements a modern Three.js canvas featuring a golden 24-spoke Dharma Chakra with concentric hub rings and spokes.
  - Orbiting tricolor civic particle constellation (India saffron `#FF9933`, white `#FFFFFF`, India green `#128807`) undulating in 3D orbit.
  - Interactive mouse tracking / pointer tilting with spring-damped easing for tactile responsiveness.
  - Dynamic responsive resize handler and memory cleanup on unmount (`geometry.dispose()`, `material.dispose()`, `renderer.dispose()`).
  - Integrated into the Hero section of `LandingPage.tsx` in a clean 2-column responsive layout.
- [x] **Grounded PDF Evidence Coordinate Viewer (`apps/web/src/components/PdfEvidenceViewerModal.tsx`)**:
  - **Single Shared Viewer (Blueprint Section 7.5 & Phase 8 Gate)**: Opens directly from any source chip, citation reference, or statutory rule quote.
  - Dynamic page rendering from backend (`GET /api/v1/evidence/{version_id}/{page_number}/image`), serving 150 DPI official gazette page images with PyMuPDF saffron bounding box highlights.
  - Visual coordinate highlights overlaid directly onto official gazette text.
  - Cryptographic SHA-256 binary digest verification badge for document provenance.
  - Multi-page navigation (previous / next page controls with boundary guards).
  - Zoom in (`+25%`), Zoom out (`-25%`), and 100% Reset controls with smooth scroll pan container.
  - Collapsible coordinate drawer showing page dimensions, total highlights, box types (heading, paragraph, table), and point coordinates `[x0, y0, x1, y1]`.
- [x] **Public Evidence & Coordinate API Endpoints (`backend/app/api/v1/documents.py`, `public_evidence_router`)**:
  - `GET /api/v1/evidence/{version_id}/{page_number}`: Returns page metadata, width, height, rotation, SHA-256 digest, and all page bounding boxes.
  - `GET /api/v1/evidence/{version_id}/{page_number}/image`: Generates on-demand 150 DPI page image with visual saffron highlight overlays.
  - Registered in master router `backend/app/api/v1/router.py`.
- [x] **Scheme Detail Upgrades with Active Rules & Evidence (`CitizenSchemeDetailPage.tsx`, `backend/app/api/v1/schemes.py`)**:
  - `GET /api/v1/schemes/{scheme_id}` enriched with `active_rules` array returning rule code, logic formula, verbatim quote, page reference, and `document_version_id`.
  - Clickable page pills (`Page {r.page_reference} (Highlight)`) opening `PdfEvidenceViewerModal`.
  - Interactive document checklist with real-time progress indicator and localStorage persistence.
  - Verified gazette list with immutable version numbers and SHA-256 hashes.
- [x] **Citizen Discover Directory Upgrades (`CitizenDiscoverPage.tsx`)**:
  - Live search filter across scheme names, ministries, categories, and financial benefits.
  - Category filter pills (All, Agriculture, Scholarships, Pension, Housing, Health).
  - Central vs. State jurisdiction badges and Rule-Enabled tags.
  - Direct links to Eligibility questionnaire, Grounded RAG Chat, and Scheme Details.
- [x] **Grounded RAG Assistant & Chat Integration (`LandingPage.tsx`, `ChatPage.tsx`)**:
  - `LandingPage.tsx`: Wired to `POST /api/v1/chat`, citation cards clickable to open `PdfEvidenceViewerModal`.
  - `ChatPage.tsx`: Citation Inspector enhanced with "Open Full PDF Highlight Viewer" button launching `PdfEvidenceViewerModal`.
- [x] **Phase 8 Gate Verification**:
  - Production build (`npm run build` in `apps/web`) passed in 972ms with **zero TypeScript errors**.
  - All **39/39 backend Pytest tests passed**.
  - Live API testing verified: Schemes list (200), Scheme details with rules (200), Evidence metadata (200), Evidence image rendering (200, 121KB PNG), Grounded RAG chat (200, 2 citations), Deterministic evaluation (200).

---

## Phase 7 Detail Checklist (Deterministic Eligibility & Ranking) — Passed

- [x] **Three-Valued Deterministic Rule Evaluator (`backend/app/eligibility/evaluator.py`)**:
  - Implements Kleene 3-valued logic (`TRUE`, `FALSE`, `UNKNOWN`) in pure Python. The LLM never touches eligibility logic.
  - Supports compound Boolean trees with `all` (AND) and `any` (OR), handling short-circuit rules ($F \land U = F$, $T \lor U = T$).
  - **Disqualification Precedence**: Explicit `exceptions` evaluate first. A triggered disqualification immediately produces `FALSE` regardless of positive qualifying conditions.
  - **External Verification Handling**: Criteria with `official_verification_required == True` correctly shift outcomes from `Eligible` to `Likely Eligible` (subject to official verification).
  - 4 Deterministic Scheme Outcomes:
    1. `Eligible`: All active rules satisfied without external official verification.
    2. `Likely Eligible`: All active rules satisfied, but dependent on external verification.
    3. `Need More Information`: At least one rule UNKNOWN, zero FALSE.
    4. `Not Eligible`: At least one rule FALSE or statutory disqualification triggered.
  - Structured, bilingual explainability reasons (`reasons_en`, `reasons_hi`), matched criteria list with gazette page citations, and missing information field lists.
- [x] **Multi-Factor Scheme Ranking Algorithm (`backend/app/eligibility/ranker.py`)**:
  - Primary sort key: Tier priority (`Eligible` [1000] > `Likely Eligible` [750] > `Need More Information` [500] > `Not Eligible` [100]).
  - Secondary factors:
    - Confidence weight: `rules_and_rag` / `rules_enabled` (+100) > `rag_only` (+20).
    - Completeness ratio: $(\text{matched} / \text{total}) \times 50$.
    - Verification status bonus: verified official gazette documents (+25).
    - Recency bonus: recent circulars and versions (+20).
- [x] **25 Synthetic Citizen Profiles Fixture Suite (`backend/tests/fixtures/citizen_profiles_25.json`)**:
  - 25 representative demographic and socio-economic profiles testing all 4 outcome tiers across PM-KISAN, PMAY-G, PM-JAY, and Uttarakhand Old Age Pension.
  - 100% deterministic assertion: every profile matches expected human-verified outcomes.
- [x] **Deterministic Eligibility Service & APIs (`backend/app/eligibility/service.py`, `backend/app/api/v1/eligibility.py`)**:
  - `POST /api/v1/eligibility/evaluate`: Evaluates profile across all registered schemes and returns ranked recommendations with full explainability.
  - `GET /api/v1/eligibility/questions` & `/api/v1/questionnaire`: Standardized questionnaire schema mapping profile fields with bilingual labels, types, options, and tooltips.
  - **Strict Invalidation Gate (Phase 7 Gate Criterion 2)**: Rules with `status != 'active'` (e.g. `needs_review`) are completely excluded from evaluation and flagged in `ignored_unverified_rules`.
- [x] **Interactive Citizen Questionnaire & Recommendations Frontend (`EligibilityQuestionnairePage.tsx`, `RecommendationsPage.tsx`, `ComparePage.tsx`)**:
  - Step-by-step progressive questionnaire disclosure with "Not Sure / मुझे पता नहीं" support mapping to UNKNOWN.
  - Recommendations screen with summary statistics cards for all 4 status categories.
  - Card view featuring rank pills (#1, #2...), score badges, collapsible deep explainability accordion (matched rules with gazette quotes, unmet conditions, missing profile fields), and score breakdowns.
  - Side-by-side scheme comparison page (`ComparePage.tsx`) comparing operational criteria and benefits.
- [x] **Phase 7 Gate Verification**:
  - Pytest suite: **39/39 tests passing** across all suites (`test_deterministic_eligibility.py`, `test_hybrid_retrieval_and_rag.py`, `test_rules_and_invalidation.py`, `test_pdf_ingestion.py`, `test_discovery_and_review.py`, `test_compliance_and_scheduler.py`, `test_health.py`).
  - Frontend production build (`tsc -b && vite build`) passed with zero errors. All gate criteria satisfied.

---

## Phase 6 Detail Checklist (Hybrid Retrieval & Groq RAG Chat) — Passed

- [x] **Hybrid Retrieval Engine (`backend/app/retrieval/hybrid.py`)**:
  - Dense semantic retrieval via multi-ngram vector space model with L2 unit normalization, generating fast cosine similarity across Devanagari and Latin scripts.
  - Sparse BM25 retrieval with Devanagari Unicode word segmentation, Hindi/English punctuation normalization, and standard BM25 hyperparameters ($k_1 = 1.5, b = 0.75$).
  - Reciprocal Rank Fusion (RRF, $k = 60$) combining dense and sparse rank lists: $\text{RRF}(d) = \sum_{m} \frac{1}{k + r_m(d)}$.
  - **Strict Verification Gate (Blueprint Section 9.1)**: Hard SQL filters guarantee that only chunks from `DocumentVersion.status in ['verified', 'ingested']` and `Document.status in ['verified', 'active']` can ever be retrieved. Superseded, draft, or pending candidates are strictly isolated at query execution.
  - Preserves constituent line bounding boxes `[x0, y0, x1, y1]` and page numbers on every retrieved chunk candidate.
- [x] **Citation Validator & Deterministic Evidence Scorer (`backend/app/llm/citation_validator.py`)**:
  - Pure deterministic function running post-generation.
  - Parses citation markers `[C{i}]` or `[C1, C2]`.
  - **Zero Hallucinated Citations Guarantee (Blueprint Section 9.5)**: Validates that every citation index $i \le \text{len(retrieved\_chunks)}$. Any hallucinated, invented, or out-of-range citations (e.g. `[C99]`) are automatically stripped and flagged.
  - Resolves verified citations to exact document title, version ID, page number, verbatim quote, and line bounding boxes.
  - Grades evidence quality deterministically: `STRONG` (official guidelines with valid citations), `PARTIAL` (supplementary circulars/articles), or `INSUFFICIENT` (unsupported query or zero verified passages).
- [x] **LLM Provider & Polite Refusal Architecture (`backend/app/llm/provider.py`)**:
  - `GroqProvider`: Uses AsyncOpenAI client with Groq base URL and `llama-3.3-70b-versatile` / `mixtral-8x7b-32768`.
  - `DeterministicGroundedProvider`: Offline/testing provider enforcing strict substantive term overlap (> 40%) against retrieved official context.
  - **Polite Refusal (Blueprint Section 9.6)**: Unsupported questions (e.g. "Can I buy a rocket ticket with PM-KISAN subsidy?") immediately return `INSUFFICIENT`, generating polite refusal messages in Hindi or English with zero fabricated citations.
- [x] **Grounded Chat & Retrieval API (`backend/app/api/v1/chat.py`)**:
  - `POST /api/v1/chat`: Standard bilingual JSON chat endpoint returning validated answer, evidence level, reasons, refusal flag, and structured citations.
  - `POST /api/v1/chat/stream`: Server-Sent Events (SSE) streaming endpoint emitting real-time pipeline status events (`retrieving`, `generating`, `validating`) and final validated payload.
  - `POST /api/v1/chat/retrieval/test`: Diagnostic endpoint exposing dense/sparse scores, RRF ranks, and bounding box telemetry.
- [x] **Interactive Citizen Chat Frontend (`apps/web/src/pages/citizen/ChatPage.tsx`)**:
  - Clean bilingual conversational interface with real-time progressive status indicators.
  - Formatted text rendering clickable `[C1]`, `[C2]` inline pills with saffron highlight styling.
  - Evidence Quality Badges (`STRONG EVIDENCE`, `PARTIAL EVIDENCE`, `INSUFFICIENT EVIDENCE`).
  - Refusal Notice callout explicitly reassuring citizens that ungrounded answers are refused to avoid hallucination.
  - Interactive Citation Evidence Drawer displaying:
    - Official Document title and verified immutable badge.
    - Exact Page number.
    - Verbatim quote snippet.
    - Visual PDF Coordinate Highlight preview simulating page sheet with saffron highlight overlay.
    - Raw bounding coordinates `[x0, y0, x1, y1]` table.
    - Chunk ID and document version cryptographic hash.
  - Scheme filter selector (All Schemes, PM-KISAN, PMAY-G, PM-JAY, UK Old Age Pension, etc.).
  - Bilingual quick-prompt chips in Hindi and English.
- [x] **Phase 6 Gate Verification**:
  - Automated Pytest suite: **32/32 tests passing** across all backend test suites (`test_hybrid_retrieval_and_rag.py`, `test_rules_and_invalidation.py`, `test_pdf_ingestion.py`, `test_discovery_and_review.py`, `test_compliance_and_scheduler.py`, `test_health.py`).
  - Browser subagent completed end-to-end testing:
    - Verified grounded inquiry for PM-KISAN, receiving `[C1]`, `[C2]`, and `STRONG EVIDENCE` badge.
    - Inspected right-side Citation Evidence drawer showing Page 1, verbatim quote, and PDF bounding boxes.
    - Verified polite refusal for unsupported "rocket ticket" query, confirming `INSUFFICIENT EVIDENCE`, Grounding Assurance notice, and zero citations.
    - Verified smooth Hindi language toggle and translated UI. All 4 gate criteria satisfied.

---

## Phase 5 Detail Checklist (Structured Schemes & Eligibility Rule Review) — Passed

- [x] **13 Initial Scheme Records & Initial Modes (`registry/schemes.yaml`)**:
  - All 13 initial schemes seeded with bilingual descriptions, level, ministry, category, and initial modes (`rules_and_rag`, `rag_and_rules`, `rag_only`).
  - Core schemes with human-verified rules (`SCHEME-PM-KISAN`, `SCHEME-PM-JAY`, `SCHEME-PMAY-G`, `SCHEME-UK-OLD-AGE`) marked `rules_enabled=True`.
  - Remaining verified schemes configured as `rag_only` awaiting human rule review, preserving strict trust separation.
- [x] **Eligibility Rule Tree Schema & Validation (`backend/app/rules/schema.py`)**:
  - Deterministic condition trees with `all` (AND), `any` (OR), and explicit `exceptions` (disqualification filters).
  - Rich operators: `equals`, `not_equals`, `greater_than_or_equal`, `less_than_or_equal`, `between_inclusive` (with `min`/`max` validation), `in_list`, `is_true`, `is_false`.
  - Mandatory evidence provenance models (`RuleSourceRef`): target `document_version_id`, 1-indexed `page_number`, and verbatim `quote`.
  - Official external verification flags (`official_verification_required`) for conditions checked by government authority records.
- [x] **Rule Service & Automated Invalidation Engine (`backend/app/rules/service.py`)**:
  - `generate_logic_expression`: Generates human-readable Boolean logic formulas from AST condition trees.
  - `create_rule`: Validates scheme, rule code uniqueness, target document version, and records dependency edges.
  - `review_rule`: Human gatekeeper enforcing that active rules must have verbatim quote, page reference, and point to a valid, non-superseded document version.
  - `invalidate_dependent_rules`: Triggered whenever a document version changes or is superseded; immediately transitions all dependent rules from `active` to `needs_review`, records an automated audit trail, and disables `scheme.rules_enabled` if no active rules remain.
- [x] **Seeded Human-Verified Core Rules (`backend/app/rules/seed_rules.py`)**:
  - 7 verified active rules seeded across PM-KISAN, PM-JAY, PMAY-G, and Uttarakhand Old Age Pension with exact gazette quotes and page numbers linked to verified document versions.
- [x] **Admin Eligibility Rules API (`backend/app/api/v1/rules.py`)**:
  - `GET /api/v1/admin/rules`: Filterable by scheme and status (`active`, `needs_review`, `draft`, `retired`), with pagination.
  - `GET /api/v1/admin/rules/summary`: Live telemetry counts across rule statuses and scheme rule-readiness.
  - `GET /api/v1/admin/rules/{rule_id}`: Full condition tree JSON, logic expression, dependency version, and review history.
  - `POST /api/v1/admin/rules`: Draft new rules with verified source citations.
  - `PUT /api/v1/admin/rules/{rule_id}`: Update rule criteria, auto-incrementing version and resetting status to `needs_review`.
  - `POST /api/v1/admin/rules/{rule_id}/review`: Human review workflow (`approve`, `request_changes`, `retire`).
  - `POST /api/v1/admin/rules/simulate-source-change`: Diagnostic endpoint for simulating source updates and verifying instant dependency invalidation.
- [x] **Interactive Admin Frontend Console (`apps/web/src/pages/admin/AdminRulesPage.tsx`)**:
  - Telemetry summary cards showing Total Rules, Active Rules, Needs Review alert counter, and Rule-Enabled schemes.
  - Status filter tabs (`All`, `Needs Review`, `Active`, `Draft`, `Retired`) and Scheme selector dropdown.
  - Rule cards with logic formula chips, verified verbatim gazette quote box, and dependency pills.
  - Inspect & Review Modal: Displays condition tree JSON, logic expression, document version, review audit history, and decision submission form.
  - "Simulate Source Update" button on cards to test invalidation gate live in the browser.
  - Draft New Rule modal with condition builder and mandatory evidence fields.
- [x] **Phase 5 Gate Verification**:
  - Automated Pytest suite: 27/27 tests passing across all suites (`test_rules_and_invalidation.py`, `test_pdf_ingestion.py`, `test_discovery_and_review.py`, `test_compliance_and_scheduler.py`, `test_health.py`).
  - Browser subagent completed end-to-end testing: navigated to `/admin/rules`, simulated source gazette change, verified automatic `needs_review` transition, inspected rule provenance, submitted human re-approval with notes, and restored rule to `active`. All 3 gate criteria satisfied.

## Phase 4 Detail Checklist (PDF Ingestion & Coordinate Extraction) — Passed

- [x] **Point-Accurate Coordinate Extractor (`backend/app/ingest/extractor.py`)**:
  - Built with PyMuPDF (`pymupdf`). Extracts page geometry (`width`, `height`, `rotation`), digital text layer, and word-level bounding boxes.
  - Merges words into line-level bounding boxes with exact PDF points `[x0, y0, x1, y1]` (72 points/inch relative to page origin `[0, 0]`).
  - Detects OCR requirement flag when pages are purely image scans without digital font glyphs.
- [x] **Strict Page-Bounded Chunker (`backend/app/ingest/chunker.py`)**:
  - Enforces Blueprint Section 7.2: Chunks **NEVER span across page boundaries** to guarantee zero-ambiguity PDF citation opening.
  - Targets 250-400 tokens per chunk (~150-300 words), detects section titles/headers, and generates deterministic chunk IDs (`chk-{version_id}-p{page:03d}-{idx:02d}`).
  - Maps every constituent line bounding box directly into `ChunkBoxDTO` coordinates with text snippets.
- [x] **Diagnostic Coordinate Visualizer & Spot-Check Renderer (`backend/app/ingest/diagnostics.py`)**:
  - Renders pages to 150 DPI PNG images and computes coordinate scaling factor (`pixels / points`).
  - Overlays semi-transparent saffron/gold highlights (`fill=(250, 204, 21, 70)`) and solid saffron borders (`outline=(217, 119, 6, 220)`) directly over stored bounding boxes.
  - Produces verifiable spot-check artifacts saved to `data/debug/{version_id}_p{page}_annotated.png` for human QA.
- [x] **Single Shared Ingestion Pipeline (`backend/app/ingest/service.py`)**:
  - Enforces Phase 4 Gate Requirement 3: Scraper-discovered documents, manual PDF uploads, and seed files all flow through the exact same `pdf_ingestion_service.ingest_document_version(db, version_id)`.
  - Atomically records `Page`, `Chunk`, and `ChunkBox` rows and records an immutable `AuditEvent` (`document_version_ingested`).
- [x] **Admin Documents & Ingestion API (`backend/app/api/v1/documents.py`)**:
  - `GET /api/v1/admin/documents`: Lists documents and versions with chunk and page counts.
  - `POST /api/v1/admin/documents/{version_id}/ingest`: Triggers on-demand coordinate extraction and chunking.
  - `POST /api/v1/admin/documents/upload`: Multipart PDF upload route feeding directly into the shared pipeline.
  - `GET /api/v1/admin/documents/{version_id}/pages`: Returns page geometry, dimensions, rotation, word count, and OCR status.
  - `GET /api/v1/admin/documents/{version_id}/chunks`: Returns chunks with token counts and constituent bounding boxes.
  - `GET /api/v1/admin/documents/{version_id}/pages/{page}/debug-image`: Serves annotated spot-check image.
- [x] **Interactive Admin Frontend Console (`apps/web/src/pages/admin/AdminDocumentsPage.tsx`)**:
  - Document table with live status badges (`ingested`, `verified`, `pending_review`), page counts, chunk counts, and SHA-256 fingerprints.
  - Ingestion trigger button with real-time feedback toast.
  - Modal Coordinate & Chunk Inspector with 3 tabs:
    - *Extracted Page-Bounded Chunks*: Live chunk list with token counts and `[x0, y0, x1, y1]` point coordinate pills.
    - *Diagnostic Coordinate Spot-Check*: High-res page visualizer displaying rendered PDF with saffron highlight boxes overlaid.
    - *Extracted Pages*: Page dimensions, word count, and digital text layer status.
  - Manual PDF upload dialog with scheme selector, title, type, and dropzone.
- [x] **Phase 4 Gate Verification**:
  - Pytest suite: 22/22 tests passing across all suites (`test_pdf_ingestion.py`, `test_discovery_and_review.py`, `test_compliance_and_scheduler.py`, `test_health.py`).
  - Browser subagent completed end-to-end testing: loaded documents table, executed live ingestion, inspected page-bounded chunks and bounding boxes, verified diagnostic spot-check image overlay, and checked manual upload modal. All 3 gate criteria satisfied.

## Phase 3 Detail Checklist (Discovery, Fetching & Admin Review Console) — Passed

- [x] **Content-Addressable Storage Service (`backend/app/discovery/storage.py`)**:
  - Raw downloaded binaries and PDFs persisted immutably keyed by SHA-256 fingerprint (`data/fetched/{hash}.bin`, `data/pdfs/{hash}.pdf`).
  - Extracted text snippets persisted for fast diffing and inspection without re-parsing.
- [x] **Diff Engine & Change Classification (`backend/app/discovery/diff.py`)**:
  - Line-by-line unified diffing via Python `difflib` with additions/deletions statistics and similarity ratio.
  - Generates machine-assisted review summaries clearly labelled: *"Machine-generated diff summary as review aid only; human inspection required."*
  - Classifies resources deterministically: `new_resource`, `unchanged`, `changed_content`, `changed_binary`, and `duplicate`.
  - Unchanged resources update observation timestamps without polluting the review queue with duplicates.
- [x] **Admin Review Queue API (`backend/app/api/v1/review.py`)**:
  - `GET /api/v1/admin/review-queue`: Filterable by status (`pending_review`, `approved`, `rejected`), source, and classification.
  - `GET /api/v1/admin/review-queue/{id}`: Detailed provenance, text snippet preview, unified diff against prior version, and impacted eligibility rules preview.
  - `POST /api/v1/admin/review-queue/{id}/approve`: Creates logical `Document` and immutable `DocumentVersion` in verified status; increments version number.
  - **Rule Invalidation Mandate (Blueprint Section 5.3)**: Approving a new document version automatically marks all active dependent rules linked via `RuleDocumentDependency` to `needs_review` and marks prior versions as `superseded_pending_review`.
  - `POST /api/v1/admin/review-queue/{id}/reject`: Records rejection reasons and audit logs.
  - `POST /api/v1/admin/review-queue/{id}/assign-scheme`: Dynamically links candidates to schemes.
- [x] **Public Search & Catalog Isolation Gate**:
  - Public scheme catalogue and detail endpoints strictly filter on `Document.status == 'verified'` and `DocumentVersion.status == 'verified'`.
  - Candidates in `pending_review` or `rejected` are completely isolated and never exposed to citizens.
- [x] **Interactive Admin Review Console (`AdminReviewQueuePage.tsx`)**:
  - Status tabs (`Pending Review`, `Approved & Verified`, `Rejected`, `All`).
  - Candidate cards with classification badges, source tags, and SHA-256 hashes.
  - Modal diff inspector with line-by-line changes and rule invalidation warnings.
  - Approval modal with scheme selection, official document title, document type, and notes.
  - Rejection dialog with required reason.
- [x] **Phase 3 Gate Verification**:
  - Pytest suite (17/17 passing) validating classification rules, unified diffs, approval flow, rule invalidation, and public isolation.
  - Browser subagent verified candidate inspection, approval, tab filtering, and public catalog isolation. All gate criteria satisfied.

---

## Phase 2 Detail Checklist (Source Registry, Compliance Gate & Scheduler) — Passed

- [x] **Source Registry & Seeding**:
  - `registry/sources.yaml` seeded with 5 official portals: `SRC-MIN-AGRI`, `SRC-UK-SOCIAL-WELFARE`, `SRC-INDIA-GOV`, `SRC-DBT-BHARAT`, and `SRC-MYSCHEME-DIR`.
  - Comprehensive source models in SQLAlchemy tracking jurisdiction, family, fetch mode, permission status, automation status, cron schedule, and audit logs.
- [x] **Strict Compliance Gate (Blueprint Section 3.3 & 3.5)**:
  - `ComplianceGate` enforces human policy approval before any source can run automatically or manually.
  - Pending and prohibited sources strictly return HTTP 403 `COMPLIANCE_GATE_BLOCKED`.
  - myScheme restricted to manual-only / disabled (`written_authorization_required`). Automation cannot be enabled absent a verified written authorization reference.
  - Human compliance review endpoint `POST /api/v1/admin/sources/{source_id}/review` records reviewer identity, decisions, notes, and optional live `robots.txt` inspection.
- [x] **Source Adapter Interface & Registry**:
  - `SourceAdapter` protocol defining `discover`, `fetch`, `parse`, and `normalize`.
  - Deterministic fixture adapter for PM-KISAN and UK Old Age Pension.
  - Ministry adapter with safe HTML/PDF parsing and exponential backoff.
  - Strict myScheme compliance adapter blocking automated crawls with `PolicyViolationError`.
- [x] **Dedicated Single-Instance Scheduler (Blueprint Section 16.2)**:
  - APScheduler 3.x manager running in dedicated single-instance mode with PID file locking (`SchedulerProcessLock`). Stale locks from terminated processes automatically reclaimed.
  - Per-source locking (`PerSourceLockManager`) prevents overlapping discovery runs and rejects concurrent execution with HTTP 409 `SOURCE_JOB_ACTIVE`.
  - Automatic cron reconciliation syncing enabled and approved sources with the scheduler.
  - Pause (`/api/v1/admin/scheduler/pause`) and Resume (`/api/v1/admin/scheduler/resume`) controls with live heartbeat telemetry.
- [x] **Manual Run Now & Idempotent Audited Discovery**:
  - `POST /api/v1/admin/sources/{source_id}/discover` triggers on-demand discovery.
  - Creates tracked `DiscoveryRun`, `ResourceObservation`, `FetchAttempt`, and `ResourceCandidate` records.
  - SHA-256 binary hash deduplication ensures idempotent runs without duplicate candidates.
  - Failures are observable in database logs, job telemetry, and admin UI.
- [x] **Interactive Admin Frontend**:
  - `AdminSourcesPage`: Live source list with badges, compliance block callouts, policy review dialog, enable/disable toggles, and Run Now execution.
  - `AdminDiscoveryPage`: Live scheduler telemetry cards, active cron jobs list, pause/resume controls, and recent discovery run table with failure inspection modal.
- [x] **Phase 2 Gate Verification**:
  - Automated Pytest suite with 11 tests passing.
  - Automated browser subagent verification executing policy review, enabling source, Run Now discovery, and scheduler pause/resume. All 4 gate criteria satisfied.

---

## Phase 1 Detail Checklist (Foundation and Design System) — Passed

- [x] **Git Repository Initialized**: Root git repository created with `.gitignore` blocking secrets, binaries, databases, and dependencies.
- [x] **Configuration & Secret Conventions**: `.env.example` created with all configuration keys defined.
- [x] **Repository Directory Layout**: `apps/web`, `backend/app`, `data`, `registry`, `docs` organized as specified in Blueprint Section 2.3.
- [x] **Initial Registry Data**: Seed sources (`registry/sources.yaml`) and seed schemes (`registry/schemes.yaml`).
- [x] **Shared API Schemas & Envelopes**: Standard response envelope `{"ok": true, "data": ..., "meta": {"request_id": "..."}}` and error envelope.
- [x] **Database Models & Alembic Migration**: All core tables defined in SQLAlchemy (schemes, sources, documents, versions, chunks, rules, etc.) with initial clean migration `0001_initial_schema`.
- [x] **Backend Health Endpoint**: `GET /health` and `GET /api/v1/health` providing readiness, database connectivity, environment, and version info.
- [x] **Frontend Application Setup**: Vite + React + TypeScript in `apps/web/` with Lucide icons, responsive navigation, and design tokens.
- [x] **Design Tokens & Light/Dark Theme**: Cohesive color palette, typography (Inter + Noto Sans Devanagari), smooth transitions, glassmorphic accents.
- [x] **Bilingual Support (Hindi / English)**: Language switcher with localized strings for core navigation, states, and route shells.
- [x] **Complete Route Shell**:
  - **Public**: `/`, `/how-it-works`, `/schemes`, `/schemes/:schemeId`
  - **Citizen App**: `/app`, `/app/chat`, `/app/discover`, `/app/eligibility`, `/app/recommendations`, `/app/schemes/:schemeId`, `/app/saved`, `/app/profile`, `/app/settings`
  - **Admin Console**: `/admin`, `/admin/sources`, `/admin/discovery`, `/admin/review-queue`, `/admin/documents`, `/admin/rules`, `/admin/audit`
- [x] **States Implementation**: Loading skeletons, empty states, error boundaries, and offline indicators.
- [x] **Gate Verification**: Backend runs and responds to health check; frontend starts without errors and all routes are navigable on mobile and desktop. Verified with automated browser testing.

---
*Last Updated:* All 10 Phases Completed Successfully (100% Gate Verified)

