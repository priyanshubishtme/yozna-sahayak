# Yojana Sahayak — Local Developer & Contributor Setup Guide

Follow these exact steps to run the complete Yojana Sahayak platform on a local development workstation.

---

## 1. Prerequisites

- **Python**: Version 3.11+
- **Node.js**: Version 18+ or 20+ (with `npm`)
- **Git**: Latest version
- **Operating System**: Windows, macOS, or Linux

---

## 2. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/yojana-sahayak.git
cd yojana-sahayak

# Create python virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

---

## 3. Frontend Installation

```bash
# Navigate to web application
cd apps/web

# Install frontend dependencies
npm install

# Return to project root
cd ../..
```

---

## 4. Environment Configuration

Copy the sample environment file:
```bash
cp .env.example .env
```

Key local configuration variables in `.env`:
```ini
APP_ENV=development
APP_PORT=8005
DATABASE_URL=sqlite+aiosqlite:///./data/yojana_sahayak.db
DATABASE_SYNC_URL=sqlite:///./data/yojana_sahayak.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=adminpassword
ADMIN_MASTER_KEY=yojana-admin-master-2026
ADMIN_SESSION_SECRET=dev-insecure-secret-key-change-in-production
GROQ_API_KEY=your_groq_api_key_here
```

---

## 5. Database Initialization & Seeding

```bash
# Initialize and seed database with 16 authentic schemes and 21 official guidelines
python -c "
from backend.app.db.base import Base
from backend.app.db.session import sync_engine
from backend.app.db.seed import seed_database
import asyncio
from backend.app.db.session import AsyncSessionLocal

Base.metadata.create_all(bind=sync_engine)
async def seed():
    async with AsyncSessionLocal() as session:
        await seed_database(session)
asyncio.run(seed())
print('Database verified and seeded successfully.')
"
```

---

## 6. Running the Servers

### Start Backend Daemon (Port 8005):
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8005 --reload
```
Test health: `curl http://127.0.0.1:8005/health`

### Start Frontend Dev Server (Port 5173):
```bash
cd apps/web
npm run dev -- --host 127.0.0.1 --port 5173
```
Access the application at `http://127.0.0.1:5173`

---

## 7. Running the Automated Test Suite

```bash
# Full backend test suite (56+ tests)
python -m pytest backend/tests/ -v

# Run RAG 40-question benchmark specifically
python -m pytest backend/tests/test_rag_benchmark_40.py -v

# Run Frontend production build verification
npm --prefix apps/web run build
```
