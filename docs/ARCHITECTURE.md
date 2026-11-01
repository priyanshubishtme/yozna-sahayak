# Yojana Sahayak — Complete System Architecture & Engineering Blueprint

Yojana Sahayak is an authentic, bilingual (Hindi & English), evidence-grounded government scheme intelligence platform. It seamlessly links Indian citizens to central and state welfare programmes through deterministic eligibility checking, zero-hallucination hybrid RAG (Dense + BM25 RRF), and authentic Web Audio speech conversation.

---

## 1. High-Level System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Presentation Tier (React 18 + Vite)"]
        UI_Citizen["Citizen Portal & Schemes (/schemes, /app)"]
        UI_Chat["Bilingual RAG Chat & Robot Companion (/chat)"]
        UI_Centre["Centre Locator (Nominatim/Overpass Map) (/centre-locator)"]
        UI_Admin["Protected Admin Console (/admin)"]
        Audio_API["Web Audio API & SpeechSynthesis (STT/TTS)"]
    end

    subgraph Gateway ["API & Application Gateway Tier (FastAPI)"]
        Router["FastAPI Master Router (/api/v1)"]
        Auth_MW["Auth & Role Guard (CITIZEN / ADMIN)"]
        Rate_MW["Token-Bucket Rate Limiter Middleware"]
        Context_MW["Trace Request Context Middleware"]
    end

    subgraph Core ["Intelligence & Business Services"]
        Assistant["Assistant Service (Simple vs Advanced Mode)"]
        Retriever["Hybrid Dense + Sparse BM25 RRF Retriever"]
        Ingest["PDF Extraction & Point-Coordinate Pipeline"]
        Evaluator["Deterministic 3-Valued Eligibility Engine"]
        Locator["Centre Locator Proxy & Distance Calculator"]
    end

    subgraph Storage ["Persistent Data & Vector Tier"]
        DB[(SQLite / PostgreSQL Relational Database)]
        DocStore["Persistent Document Storage (PDFs & Pages)"]
        ChromaStore["Vector Indexes & Embeddings"]
    end

    UI_Citizen --> Router
    UI_Chat --> Router
    UI_Centre --> Router
    UI_Admin --> Router
    Audio_API <--> UI_Chat

    Router --> Rate_MW --> Auth_MW --> Context_MW
    Context_MW --> Assistant
    Context_MW --> Retriever
    Context_MW --> Ingest
    Context_MW --> Evaluator
    Context_MW --> Locator

    Assistant --> Retriever
    Assistant --> Evaluator
    Retriever --> DB
    Retriever --> ChromaStore
    Ingest --> DB
    Ingest --> DocStore
    Evaluator --> DB
```

---

## 2. Interaction Modes: Simple vs Advanced Mode

Yojana Sahayak supports two interaction modes backed by the **identical underlying RAG knowledge base, database, and citation verification engine**:

```mermaid
flowchart LR
    Citizen["Citizen User"] -->|Selects Mode| Switcher{"Assistant Mode"}
    Switcher -->|Simple Mode| SimpleResponse["Plain Language<br/>Bite-Sized Checklist<br/>Tangible Examples<br/>Step-by-Step Actions"]
    Switcher -->|Advanced Mode| AdvResponse["Exhaustive Statutory Rules<br/>Specific Clause Citations<br/>Disqualification Provisions<br/>Verbatim Gazette References"]
    
    SimpleResponse --> SharedRAG["Shared Hybrid RAG Pipeline & SQLite Scheme DB"]
    AdvResponse --> SharedRAG
```

1. **Simple Mode (सरल मोड)**:
   - Tailored for everyday citizens.
   - Plain conversational phrasing, avoiding administrative jargon.
   - Tangible examples (e.g. ₹2,000 every 4 months directly into your bank account).
   - Bite-sized document checklists and clear next steps.
2. **Advanced Mode (उन्नत मोड)**:
   - Designed for policy researchers, legal advisors, administrators, and welfare advocates.
   - Comprehensive eligibility rules, statutory exclusion clauses, legal definitions, exact document versions, and verbatim gazette citations.

---

## 3. Grounded Hybrid RAG Pipeline Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Citizen as Citizen / User
    participant Web as React Frontend
    participant API as FastAPI Assistant API
    participant RAG as Hybrid Retriever (Dense + BM25)
    participant DB as SQLite / DocStore
    participant LLM as Grounded LLM / Fallback

    Citizen->>Web: Speaks or types query (Hindi / English)
    Web->>API: POST /api/v1/assistant/chat (query, lang, mode)
    API->>RAG: search(query, scheme_id, k=4)
    RAG->>DB: Fetch verified document versions only (status='verified')
    DB-->>RAG: Return candidate chunks with point-coordinates
    RAG->>RAG: Compute Dense Vector + BM25 Reciprocal Rank Fusion
    RAG-->>API: Top-ranked chunks with [C#] metadata & bounding boxes
    API->>LLM: Prompt with verified context & Mode guidelines
    LLM-->>API: Grounded reply with [C#] citations & speech_text
    API-->>Web: Structured JSON (reply, speech_text, cards, citations, brief)
    Web-->>Citizen: Interactive Scheme Cards + Audio Waveform Playback
```

---

## 4. Persistent Relational Schema

The application persists all core entities in relational database tables:
- `users`: User identity, password hash (salted PBKDF2), role (`CITIZEN` / `ADMIN`), preferences.
- `citizen_profiles`: Comprehensive socio-economic, occupational, and demographic attributes.
- `schemes`: Public scheme records, category, ministries, descriptions (EN & HI).
- `documents` & `document_versions`: Official gazettes, storage keys, MIME type, hashes, approval statuses.
- `pages`, `chunks`, `chunk_boxes`: Page-bounded chunks with point-accurate bounding box coordinates.
- `eligibility_rules` & `rule_reviews`: Deterministic eligibility conditions, provenance quotes, page refs.
- `assessment_responses` & `assessment_history`: 7-step questionnaire in-progress and audit trail.
- `citizen_saved_schemes` & `application_tracker_records`: Bookmarks and application status timelines.
- `audit_events`: Full audit trail of administrative and citizen interactions.
