# Yojana Sahayak — Manual PDF Ingestion & Demonstration Guide

This step-by-step guide explains exactly how an administrator can upload a real government PDF guideline, inspect the extracted coordinates, verify RAG indexing, and test citizen conversational queries.

---

## Workflow 1: Administrator Uploads a Government PDF

1. **Access the Admin Console**:
   - Open your browser to `http://127.0.0.1:5173/admin/documents`
   - If prompted, enter the Master Passkey: `yojana-admin-master-2026` or log in with `admin@yojana.gov.in` / `adminpassword`.

2. **Open the Manual Upload Modal**:
   - Click the **Manual PDF Upload** button in the upper-right corner.
   - The upload dialog displays drag-and-drop file selection, scheme assignment, and document type.

3. **Select File and Enter Metadata**:
   - **Target Scheme**: Select *PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)* or another available scheme.
   - **Document Title**: `PM-KISAN Operational Guidelines Revised 2024`
   - **Document Type**: `Operational Guidelines`
   - **File**: Select an official government PDF (e.g. from the `pdf/` directory or ministry website).

4. **Trigger Shared Ingestion**:
   - Click **Upload & Ingest Document**.
   - The backend validates the PDF, calculates the SHA-256 binary hash, runs PyMuPDF coordinate extraction, creates page records, segments text into page-bounded chunks, and persists bounding boxes.
   - A success toast confirms: *“Manual PDF uploaded and ingested via shared pipeline! Extracted X chunks.”*

---

## Workflow 2: Inspect Extracted Coordinates & Bounding Boxes

1. In the Document Versions table, locate the newly uploaded document version.
2. Click the **Inspect Pages & Chunks** action button.
3. The Coordinate Inspector displays:
   - **Chunks Tab**: List of all page-bounded chunks, word counts, section titles, and token lengths.
   - **Pages Tab**: Page dimensions (width x height), rotation, and OCR status.
   - **Bounding Boxes**: Exact `[x0, y0, x1, y1]` point coordinates for every text snippet.
4. Verify that page numbers are positive and no chunks span multiple pages.

---

## Workflow 3: Ask a Grounded Question in Citizen AI Chat

1. Navigate to the Citizen AI Chat: `http://127.0.0.1:5173/chat`
2. Enter a query answered by the newly ingested PDF:
   - *“What is the financial installment pattern in PM-KISAN?”*
   - Or in Hindi: *“पीएम-किसान योजना में कितनी किस्तें और कितनी राशि मिलती है?”*
3. **Verify the RAG Response**:
   - The assistant cites the official guideline using citation markers `[C1]`, `[C2]`.
   - The financial breakdown correctly reports: *₹6,000 per annum disbursed in three equal 4-monthly installments of ₹2,000 each via DBT*.
4. **Inspect Source Evidence**:
   - Click the citation chip `[C1]`.
   - The `PdfEvidenceViewerModal` opens the verbatim source document page with official ministry provenance.

---

## Workflow 4: Compare Simple Mode vs Advanced Mode

1. In the AI Chat header, click the **Mode Toggle**:
   - Switch to **Simple Mode (सरल मोड)**:
     - Ask: *“I am a small farmer. How do I get money from PM-KISAN?”*
     - The assistant explains the benefit in plain, friendly language with examples and a clear document checklist.
   - Switch to **Advanced Mode (उन्नत मोड)**:
     - Ask the same question.
     - The assistant returns exhaustive statutory rule references, exclusionary criteria (e.g. institutional landholders, income tax payers), and official gazette version identifiers.
   - Both modes share the same verified citations!
