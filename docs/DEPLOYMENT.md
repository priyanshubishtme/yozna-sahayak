# Yojana Sahayak — Production Deployment & Release Guide

This guide details the deployment architecture, containerization, environment variables, and zero-downtime operational procedures for Yojana Sahayak.

---

## 1. Production Architecture

- **Frontend**: Static single-page application built with Vite, deployable to Netlify, Vercel, Cloudflare Pages, or AWS S3/CloudFront.
- **Backend**: FastAPI asynchronous Python application running behind Uvicorn and Nginx reverse proxy.
- **Database**: PostgreSQL (or persistent SQLite volume for single-container setups).
- **Persistent Storage**: Persistent Volume Mount for `data/` directory (PDF storage, document pages, and SQLite database).

---

## 2. Docker & Container Deployment

### Production Dockerfile (Backend):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
COPY registry/ registry/
COPY data/ data/

EXPOSE 8005

CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8005"]
```

### Production Frontend Build:
```bash
cd apps/web
npm ci
npm run build
# Deploy 'dist/' folder to CDN or web server
```

---

## 3. Health Monitoring Endpoints

- `GET /health`: Basic server and dependency readiness check.
- `GET /api/v1/health`: Comprehensive system health report including database connection, scheduler status, and document statistics.
