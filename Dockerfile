# Multi-stage Dockerfile for Yojana Sahayak Production Deployment
# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/apps/web
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build

# Stage 2: Production Python Backend + Static Assets
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    APP_PORT=8005

# System dependencies for PDF processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

COPY backend/ ./backend/
COPY registry/ ./registry/
COPY data/ ./data/

# Copy compiled frontend from Stage 1 into apps/web/dist
COPY --from=frontend-builder /app/apps/web/dist ./apps/web/dist

EXPOSE 8005

CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8005"]
