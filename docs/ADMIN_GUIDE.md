# Yojana Sahayak — Complete Administrator Operations Guide

This manual covers the administrative workflows, source compliance, rule review, discovery jobs, and security monitoring features in Yojana Sahayak.

---

## 1. Admin Console Structure

The Admin Console is accessible at `/admin` and comprises 8 operational modules:

1. **Overview Dashboard (`/admin`)**:
   - Real-time statistics: Total Schemes, Registered Sources, Ingested Documents, Active Rules, and Pending Reviews.
   - Pipeline health and scheduler heartbeat status.
2. **Source Registry (`/admin/sources`)**:
   - Official portal registry with automated compliance checks (`robots.txt`, terms of use).
   - Rate limiting parameters (request interval, download caps, cron schedules).
   - Toggle automated discovery jobs on/off.
3. **Discovery Jobs (`/admin/discovery`)**:
   - Manual “Run Discovery Now” trigger.
   - Live telemetry: pages fetched, new candidates created, latency, and error logs.
4. **Review Queue (`/admin/review-queue`)**:
   - Human-in-the-loop candidate review: approve, reject, or mark duplicate with unified diff view.
5. **Document Versions (`/admin/documents`)**:
   - Point-accurate coordinate inspection and manual PDF upload.
6. **Eligibility Rules Console (`/admin/rules`)**:
   - Complete eligibility rule lifecycle: active, needs review, draft, retired.
   - Provenance gate: each rule requires an official evidence quote and page reference.
7. **Audit History (`/admin/audit`)**:
   - Immutable audit trail of all administrative and citizen actions.
   - Export audit logs to JSON or CSV.
8. **Freshness & Analytics (`/admin/freshness`)**:
   - Source staleness indicators and document update monitors.

---

## 2. Managing Eligibility Rules

Uploading a document and activating scheme eligibility are treated as separate, deliberate operations:
1. When a new document is ingested, dependent rules enter `needs_review` status.
2. Administrators review the candidate rule against the verbatim quoted guideline.
3. Once approved, the rule becomes `active` and is automatically incorporated into the deterministic eligibility engine.
