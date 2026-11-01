# Yojana Sahayak (योजना सहायक)

> **Verified Government Scheme Intelligence & Evidence-Grounded Citizen Guidance Platform**

Yojana Sahayak connects Indian citizens with central and state welfare programmes through authentic official government documents, zero-hallucination hybrid RAG (Dense + BM25 RRF), deterministic eligibility evaluation, and authentic Web Audio speech conversation.

---

## 🌟 Core Features

- **Grounded AI Companion**: Dual **Simple Mode** (citizen-friendly, illustrative) and **Advanced Mode** (statutory rule references, clause citations) powered by verified government gazettes.
- **Authentic Audio Waveform & Speech**: Real Web Audio API frequency visualizer (8 frequency bands) with natural sentence-chunked Text-to-Speech (TTS) and live editable Speech-to-Text (STT) in Hindi and English.
- **Verified PDF Point-Coordinate Ingestion**: Page-bounded chunking preserving verbatim bounding boxes `[x0, y0, x1, y1]` for click-to-inspect gazette citations.
- **Deterministic 7-Step Eligibility Engine**: Three-valued logic (Eligible, Likely Eligible, Ineligible) based strictly on administrator-approved rules with statutory provenance.
- **Centre Locator**: Interactive Leaflet & OpenStreetMap geolocation proxy for finding nearby CSCs, Seva Kendras, and government administrative offices.
- **Protected Administrator Console**: Source registry compliance (`robots.txt`), automated discovery jobs, candidate review queue, rule review, and audit trail export.
- **Complete Theme & Language Support**: 100% Light Mode and Dark Mode support with zero-flash rendering; complete Hindi and English localization across all interfaces.

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
python -m venv .venv
# Activate virtual environment
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8005 --reload
```

### 2. Frontend Setup
```bash
cd apps/web
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Visit `http://127.0.0.1:5173` to explore the application!

---

## 📖 Comprehensive Documentation

Explore the complete technical manuals in the [`docs/`](docs/INDEX.md) directory:
- [System Architecture](docs/ARCHITECTURE.md)
- [Local Setup Guide](docs/LOCAL_SETUP.md)
- [Environment Variables](docs/ENVIRONMENT_VARIABLES.md)
- [RAG Pipeline Deep Dive](docs/RAG_PIPELINE.md)
- [Manual PDF Ingestion Demo](docs/PDF_INGESTION_AND_DEMO.md)
- [Administrator Operations Guide](docs/ADMIN_GUIDE.md)
- [Demo Access & Credentials](docs/DEMO_ACCESS.md)
- [Production Deployment](docs/DEPLOYMENT.md)
- [Automated Testing Report](docs/TESTING.md)
- [Security & Data Protection](docs/SECURITY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## 🧪 Testing

```bash
# Run full backend test suite (59 tests passed)
python -m pytest backend/tests/ -v

# Run Frontend build verification
npm --prefix apps/web run build
```
