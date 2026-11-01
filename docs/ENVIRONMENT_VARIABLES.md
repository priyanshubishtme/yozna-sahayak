# Yojana Sahayak — Complete Environment Variables Reference

This document catalogs every environment variable recognized by Yojana Sahayak, their purpose, default values, and security classifications.

---

## 1. Core Server & Runtime Configuration

| Variable | Type | Default | Mandatory | Description |
|---|---|---|---|---|
| `APP_NAME` | string | `Yojana Sahayak` | No | Display name of the platform |
| `APP_ENV` | string | `development` | No | Environment: `development`, `staging`, `production` |
| `APP_HOST` | string | `0.0.0.0` | No | Bind address for Uvicorn server |
| `APP_PORT` | integer | `8005` | No | Listening port for backend server |
| `API_V1_PREFIX` | string | `/api/v1` | No | Versioned REST API routing prefix |
| `TIMEZONE` | string | `Asia/Kolkata` | No | Standard application timezone |
| `DEFAULT_LANGUAGE` | string | `hi` | No | Default UI language (`hi` or `en`) |

---

## 2. Security, Authentication & Passkeys

| Variable | Type | Default | Security Level | Description |
|---|---|---|---|---|
| `ADMIN_SESSION_SECRET` | string | `dev-insecure-secret...` | **CRITICAL** | HMAC secret used to sign session tokens. Must be rotated in production. |
| `ADMIN_USERNAME` | string | `admin` | Medium | Standard admin login username |
| `ADMIN_PASSWORD` | string | `adminpassword` | **CRITICAL** | Administrator password. Set via secure environment injection. |
| `ADMIN_MASTER_KEY` | string | `yojana-admin-master-2026` | **CRITICAL** | Direct Master Passkey for physical supervisor access. |
| `DEMO_ADMIN_EMAIL` | string | `admin@yojana.gov.in` | Low | Evaluator demo login email |
| `DEMO_ADMIN_PASSWORD` | string | `adminpassword` | Medium | Evaluator disposable demo password |
| `ALLOWED_ORIGINS` | list | `["http://localhost:5173", ...]` | High | Allowed CORS cross-origin domain list |

---

## 3. Storage, Database & Vector Persistence

| Variable | Type | Default | Mandatory | Description |
|---|---|---|---|---|
| `DATABASE_URL` | string | `sqlite+aiosqlite:///./data/yojana_sahayak.db` | **Yes** | Async SQLAlchemy database connection string |
| `DATABASE_SYNC_URL` | string | `sqlite:///./data/yojana_sahayak.db` | **Yes** | Synchronous SQLAlchemy connection string for migrations |
| `DATA_DIR` | path | `./data` | No | Local directory for PDFs, debug spot-checks, and backups |
| `CHROMA_PERSIST_DIR` | path | `./data/indexes/chroma` | No | Directory for Chroma vector database index |

---

## 4. LLM & Conversational AI Providers

| Variable | Type | Default | Mandatory | Description |
|---|---|---|---|---|
| `GROQ_API_KEY` | string | `""` | No* | Groq API Key for high-speed LLM inference. Deterministic RAG fallback engages if omitted or rate-limited. |
| `GROQ_MODEL` | string | `openai/gpt-oss-120b` | No | LLM model target (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`) |
| `GROQ_BASE_URL` | string | `https://api.groq.com/openai/v1` | No | LLM API endpoint base URL |

---

## 5. RAG Retrieval Tuning

| Variable | Type | Default | Description |
|---|---|---|---|
| `DENSE_K` | integer | `12` | Number of dense vector candidate chunks to retrieve |
| `SPARSE_K` | integer | `12` | Number of BM25 candidate chunks to retrieve |
| `FINAL_K` | integer | `4` | Number of top fused chunks supplied in LLM prompt context |
| `RRF_K` | integer | `60` | Reciprocal Rank Fusion smoothing parameter constant |
