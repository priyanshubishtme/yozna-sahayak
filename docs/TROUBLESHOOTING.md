# Yojana Sahayak — Comprehensive Troubleshooting Guide

This guide helps developers and operators diagnose and resolve common operational issues.

---

## 1. Backend Startup Issues

### Problem: `Address already in use` (Port 8005)
- **Cause**: An existing Uvicorn or Python process is still holding port 8005.
- **Fix**:
  ```powershell
  # Windows PowerShell:
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8005).OwningProcess | Stop-Process -Force
  ```

---

## 2. Audio & Speech Recognition Issues

### Problem: Microphone access denied or no speech recognized
- **Cause**: Browser permissions blocked or non-HTTPS origin in production.
- **Fix**:
  - In browser address bar, click the site settings icon and set **Microphone** to **Allow**.
  - Web Audio API and SpeechRecognition require `localhost` or `https://` in Chromium.
  - Citizens can type their question if microphone access is unavailable.

---

## 3. RAG & Retrieval Issues

### Problem: Assistant returns `Grounding Assurance` refusal for valid question
- **Cause**: Active scheme document version is not marked `verified` or search term is outside gazette scope.
- **Fix**:
  - Open `/admin/documents` and verify that the target document shows status `verified`.
  - Re-run ingestion to ensure page-bounded chunks are indexed.
