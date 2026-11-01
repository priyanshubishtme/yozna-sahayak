# Yojana Sahayak — Security Architecture & Data Protection Protocol

This document details the security principles, cryptographic standards, zero-trust boundaries, and data protection mechanisms implemented in Yojana Sahayak.

---

## 1. Authentication & Password Security

- **Password Storage**: Passwords are never stored in plaintext. They are hashed using **PBKDF2-HMAC-SHA256** with 100,000 iterations and a unique 16-byte cryptographically random salt (`salt$hash`).
- **Session Tokens**: Time-bounded, cryptographically signed tokens generated via **HMAC-SHA256** with server-side signature validation and expiration checks.
- **Admin Boundaries**: Administrative endpoints strictly enforce the `ADMIN` role or verified Master Passkey. Plain citizen accounts receive HTTP `403 Forbidden` if they attempt to access admin APIs.

---

## 2. Zero Hallucination & Evidence Verification Gate

- Scheme eligibility claims and financial benefit assertions must reference a verified document version (`status='verified'`).
- The assistant is forbidden from inventing schemes, deadlines, or payment amounts.
- If no official evidence exists, the system executes an automated abstention.

---

## 3. Privacy & Citizen Data Isolation

- Citizen demographic profiles, questionnaire responses, and application reference numbers are scoped strictly by authenticated `user_identifier`.
- Analytics logs strictly exclude Personally Identifiable Information (PII): no names, phone numbers, or email addresses are stored in analytics aggregates.
