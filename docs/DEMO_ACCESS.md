# Yojana Sahayak — Demo & Evaluator Access Protocol

This document explains how evaluators, hackathon judges, and administrators can access the Yojana Sahayak platform with administrative privileges.

---

## 1. Demo Credentials

For quick evaluation and local demonstration:

| Role | Username / Email | Password | Direct Passkey |
|---|---|---|---|
| **Administrator** | `admin@yojana.gov.in` | `adminpassword` | `yojana-admin-master-2026` |
| **Citizen (Default)**| `citizen-default` | *N/A (Open)* | *N/A* |

---

## 2. Admin Authentication Paths

1. **Standard Administrator Login**:
   - Navigate to `/admin` or `/app` and click **Admin Console** in the top navigation.
   - Enter `admin@yojana.gov.in` and `adminpassword`.
   - A cryptographically signed 24-hour admin session token is issued.

2. **Supervisor Master Passkey Bypass**:
   - For rapid evaluator access without entering credentials:
   - On the Admin Lock screen, click **Enter Master Passkey**.
   - Input: `yojana-admin-master-2026`.
   - Immediate administrative access is granted with full privileges.

---

## 3. Production Credential Rotation

In a production environment:
- Set `ADMIN_PASSWORD` in your secret manager or `.env`.
- Set `ADMIN_MASTER_KEY` to a cryptographically strong secret.
- Rotate `ADMIN_SESSION_SECRET` to immediately invalidate all existing sessions.
- Demo bypass accounts are strictly disabled when `APP_ENV=production`.
