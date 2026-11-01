"""SQLAlchemy Models representing the complete Yojana Sahayak persistence schema.

Defined per Blueprint V2 Section 13 (Tables 13.1 and Relationships 13.2).
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer,
    String, Text, JSON, Table
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base, TimestampMixin, utc_now


class Scheme(Base, TimestampMixin):
    """Public government programme identity and high-level metadata."""
    __tablename__ = "schemes"

    scheme_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name_en: Mapped[str] = mapped_column(String(255), nullable=False)
    name_hi: Mapped[str] = mapped_column(String(255), nullable=False)
    short_name: Mapped[Optional[str]] = mapped_column(String(64))
    level: Mapped[str] = mapped_column(String(32), default="central")  # central | state
    ministry_or_dept: Mapped[Optional[str]] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(128), index=True)
    description_en: Mapped[str] = mapped_column(Text)
    description_hi: Mapped[str] = mapped_column(Text)
    initial_mode: Mapped[str] = mapped_column(String(32), default="rag_only")  # rag_only | rag_and_rules
    rule_scope: Mapped[str] = mapped_column(String(64), default="rag_only")
    rag_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    rules_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    official_portal_url: Mapped[Optional[str]] = mapped_column(String(512))
    benefits_summary_en: Mapped[Optional[str]] = mapped_column(Text)
    benefits_summary_hi: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    documents = relationship("SchemeDocument", back_populates="scheme", cascade="all, delete-orphan")
    rules = relationship("EligibilityRule", back_populates="scheme", cascade="all, delete-orphan")


class Source(Base, TimestampMixin):
    """Source registry entry tracking allowed portals, adapters, and policy compliance."""
    __tablename__ = "sources"

    source_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    base_url: Mapped[str] = mapped_column(String(512), nullable=False)
    source_family: Mapped[str] = mapped_column(String(64), nullable=False)  # central_ministry, discovery_portal, etc.
    jurisdiction: Mapped[str] = mapped_column(String(32), default="IN")
    language_hints: Mapped[List[str]] = mapped_column(JSON, default=list)
    source_role: Mapped[str] = mapped_column(String(64), default="discovery_and_authoritative_documents")
    adapter_key: Mapped[str] = mapped_column(String(64), nullable=False)
    fetch_mode: Mapped[str] = mapped_column(String(32), default="requests")  # requests | playwright | manual
    allowed_content_types: Mapped[List[str]] = mapped_column(JSON, default=list)
    robots_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    terms_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    terms_url: Mapped[Optional[str]] = mapped_column(String(512))
    permission_status: Mapped[str] = mapped_column(String(64), default="pending_review")  # approved | pending_review | prohibited | written_authorization_required
    automation_status: Mapped[str] = mapped_column(String(32), default="disabled")  # enabled | disabled
    written_authorization_reference: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    request_interval_seconds: Mapped[int] = mapped_column(Integer, default=5)
    max_pages_per_run: Mapped[int] = mapped_column(Integer, default=20)
    max_download_mb: Mapped[int] = mapped_column(Integer, default=40)
    schedule_cron: Mapped[str] = mapped_column(String(64), default="0 3 * * *")
    last_success_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_error_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_error_code: Mapped[Optional[str]] = mapped_column(String(64))
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    runs = relationship("DiscoveryRun", back_populates="source", cascade="all, delete-orphan")
    candidates = relationship("ResourceCandidate", back_populates="source")


class DiscoveryRun(Base):
    """A scheduled or manual execution of a source discovery job."""
    __tablename__ = "discovery_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(64), ForeignKey("sources.source_id"), nullable=False)
    trigger_type: Mapped[str] = mapped_column(String(32), default="scheduled")  # scheduled | manual
    status: Mapped[str] = mapped_column(String(32), default="queued")  # queued | running | completed | completed_with_warnings | failed
    pages_discovered: Mapped[int] = mapped_column(Integer, default=0)
    pages_fetched: Mapped[int] = mapped_column(Integer, default=0)
    candidates_created: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    source = relationship("Source", back_populates="runs")
    observations = relationship("SourceObservation", back_populates="run", cascade="all, delete-orphan")


class SourceObservation(Base):
    """Observation record for a URL discovered during a run."""
    __tablename__ = "source_observations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(64), ForeignKey("sources.source_id"), nullable=False)
    run_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("discovery_runs.id"))
    observed_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    canonical_url: Mapped[str] = mapped_column(String(1024), nullable=False, index=True)
    content_type: Mapped[Optional[str]] = mapped_column(String(128))
    etag: Mapped[Optional[str]] = mapped_column(String(128))
    last_modified: Mapped[Optional[str]] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="discovered")
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    run = relationship("DiscoveryRun", back_populates="observations")


class FetchAttempt(Base):
    """Log of every individual HTTP fetch attempt."""
    __tablename__ = "fetch_attempts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("discovery_runs.id"))
    source_id: Mapped[str] = mapped_column(String(64), ForeignKey("sources.source_id"), nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    http_status: Mapped[Optional[int]] = mapped_column(Integer)
    latency_ms: Mapped[Optional[float]] = mapped_column(Float)
    content_type: Mapped[Optional[str]] = mapped_column(String(128))
    content_length: Mapped[Optional[int]] = mapped_column(Integer)
    binary_sha256: Mapped[Optional[str]] = mapped_column(String(64))
    error: Mapped[Optional[str]] = mapped_column(Text)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ResourceCandidate(Base):
    """Newly discovered or changed resource awaiting human review."""
    __tablename__ = "resource_candidates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(64), ForeignKey("sources.source_id"), nullable=False)
    run_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("discovery_runs.id"))
    canonical_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    original_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)
    binary_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    normalized_text_sha256: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    title: Mapped[Optional[str]] = mapped_column(String(512))
    issuer: Mapped[Optional[str]] = mapped_column(String(255))
    detected_date: Mapped[Optional[str]] = mapped_column(String(64))
    classification: Mapped[str] = mapped_column(String(32), default="new_resource")  # new_resource | changed_binary | changed_content | duplicate
    review_status: Mapped[str] = mapped_column(String(32), default="pending_review")  # pending_review | approved | rejected | duplicate
    review_notes: Mapped[Optional[str]] = mapped_column(Text)
    assigned_scheme_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("schemes.scheme_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    source = relationship("Source", back_populates="candidates")


class Document(Base, TimestampMixin):
    """Logical document identity (e.g. 'PM-KISAN Operational Guidelines 2024')."""
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    document_type: Mapped[str] = mapped_column(String(64), default="guideline")  # guideline | circular | notification | faq
    issuer: Mapped[Optional[str]] = mapped_column(String(255))
    jurisdiction: Mapped[str] = mapped_column(String(32), default="IN")
    status: Mapped[str] = mapped_column(String(32), default="pending_review")  # discovered | pending_review | verified | update_pending_review | outdated | rejected

    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
    schemes = relationship("SchemeDocument", back_populates="document", cascade="all, delete-orphan")


class DocumentVersion(Base):
    """Immutable version of a fetched document file with cryptographic fingerprints."""
    __tablename__ = "document_versions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(64), ForeignKey("documents.id"), nullable=False)
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    binary_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    normalized_text_sha256: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), default="application/pdf")
    content_length: Mapped[int] = mapped_column(Integer, default=0)
    page_count: Mapped[int] = mapped_column(Integer, default=0)
    source_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    final_url: Mapped[Optional[str]] = mapped_column(String(1024))
    etag: Mapped[Optional[str]] = mapped_column(String(128))
    last_modified: Mapped[Optional[str]] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="pending_review")  # pending_review | verified | superseded_pending_review | outdated | rejected
    parser_version: Mapped[str] = mapped_column(String(32), default="pymupdf_v1")
    created_by_job_id: Mapped[Optional[str]] = mapped_column(String(64))
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    ingested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    document = relationship("Document", back_populates="versions")
    pages = relationship("Page", back_populates="version", cascade="all, delete-orphan")
    chunks = relationship("Chunk", back_populates="version", cascade="all, delete-orphan")
    reviews = relationship("DocumentReview", back_populates="version", cascade="all, delete-orphan")


class SchemeDocument(Base):
    """Join table linking schemes to logical documents."""
    __tablename__ = "scheme_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scheme_id: Mapped[str] = mapped_column(String(64), ForeignKey("schemes.scheme_id"), nullable=False)
    document_id: Mapped[str] = mapped_column(String(64), ForeignKey("documents.id"), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True)
    relationship_type: Mapped[str] = mapped_column(String(64), default="governing_guideline")

    scheme = relationship("Scheme", back_populates="documents")
    document = relationship("Document", back_populates="schemes")


class DocumentReview(Base):
    """Audit record of human verification decisions on document versions."""
    __tablename__ = "document_reviews"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_version_id: Mapped[str] = mapped_column(String(64), ForeignKey("document_versions.id"), nullable=False)
    reviewer: Mapped[str] = mapped_column(String(128), nullable=False)
    decision: Mapped[str] = mapped_column(String(32), nullable=False)  # approved | rejected
    notes: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    version = relationship("DocumentVersion", back_populates="reviews")


class Page(Base):
    """Single page metadata extracted from a PDF document version."""
    __tablename__ = "pages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_version_id: Mapped[str] = mapped_column(String(64), ForeignKey("document_versions.id"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[float] = mapped_column(Float, default=595.0)
    height: Mapped[float] = mapped_column(Float, default=842.0)
    raw_text: Mapped[Text] = mapped_column(Text, default="")
    ocr_used: Mapped[bool] = mapped_column(Boolean, default=False)
    rotation: Mapped[int] = mapped_column(Integer, default=0)
    word_count: Mapped[int] = mapped_column(Integer, default=0)

    version = relationship("DocumentVersion", back_populates="pages")
    chunks = relationship("Chunk", back_populates="page")


class Chunk(Base):
    """Page-bounded text chunk prepared for hybrid retrieval and citation."""
    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_version_id: Mapped[str] = mapped_column(String(64), ForeignKey("document_versions.id"), nullable=False)
    page_id: Mapped[str] = mapped_column(String(64), ForeignKey("pages.id"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    section_title: Mapped[Optional[str]] = mapped_column(String(255))
    text: Mapped[Text] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, default=0)

    version = relationship("DocumentVersion", back_populates="chunks")
    page = relationship("Page", back_populates="chunks")
    boxes = relationship("ChunkBox", back_populates="chunk", cascade="all, delete-orphan")


class ChunkBox(Base):
    """Bounding box coordinates for highlighting evidence on rendered PDF pages."""
    __tablename__ = "chunk_boxes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    chunk_id: Mapped[str] = mapped_column(String(64), ForeignKey("chunks.id"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    x0: Mapped[float] = mapped_column(Float, nullable=False)
    y0: Mapped[float] = mapped_column(Float, nullable=False)
    x1: Mapped[float] = mapped_column(Float, nullable=False)
    y1: Mapped[float] = mapped_column(Float, nullable=False)
    text_snippet: Mapped[Optional[str]] = mapped_column(Text)

    chunk = relationship("Chunk", back_populates="boxes")


class EligibilityRule(Base, TimestampMixin):
    """Deterministic, human-approved eligibility condition sets."""
    __tablename__ = "eligibility_rules"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    scheme_id: Mapped[str] = mapped_column(String(64), ForeignKey("schemes.scheme_id"), nullable=False)
    rule_code: Mapped[str] = mapped_column(String(64), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    rule_json: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    logic_expression: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="pending_review")  # active | needs_review | retired | pending_review
    evidence_quote: Mapped[Text] = mapped_column(Text, nullable=False)
    page_reference: Mapped[Optional[int]] = mapped_column(Integer)

    scheme = relationship("Scheme", back_populates="rules")
    dependencies = relationship("RuleDocumentDependency", back_populates="rule", cascade="all, delete-orphan")
    reviews = relationship("RuleReview", back_populates="rule", cascade="all, delete-orphan")


class RuleDocumentDependency(Base):
    """Dependency link between an active rule and the specific document version it relies on."""
    __tablename__ = "rule_document_dependencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    rule_id: Mapped[str] = mapped_column(String(64), ForeignKey("eligibility_rules.id"), nullable=False)
    document_version_id: Mapped[str] = mapped_column(String(64), ForeignKey("document_versions.id"), nullable=False)
    chunk_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("chunks.id"))
    page_number: Mapped[Optional[int]] = mapped_column(Integer)

    rule = relationship("EligibilityRule", back_populates="dependencies")


class RuleReview(Base):
    """Audit trail for human review, revision, and approval of eligibility rules."""
    __tablename__ = "rule_reviews"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    rule_id: Mapped[str] = mapped_column(String(64), ForeignKey("eligibility_rules.id"), nullable=False)
    reviewer: Mapped[str] = mapped_column(String(128), nullable=False)
    decision: Mapped[str] = mapped_column(String(32), nullable=False)  # approved | revised | retired
    notes: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    rule = relationship("EligibilityRule", back_populates="reviews")


class IngestionJob(Base):
    """Status tracker for asynchronous document parsing and vector indexing jobs."""
    __tablename__ = "ingestion_jobs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_version_id: Mapped[str] = mapped_column(String(64), ForeignKey("document_versions.id"), nullable=False)
    stage: Mapped[str] = mapped_column(String(64), default="extract")  # extract | ocr | chunk | embed | index
    status: Mapped[str] = mapped_column(String(32), default="queued")  # queued | running | completed | failed
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ChatSession(Base, TimestampMixin):
    """Session container for chat interactions."""
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_language: Mapped[str] = mapped_column(String(8), default="hi")
    title: Mapped[Optional[str]] = mapped_column(String(255))

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Individual conversational exchange with verified citation mappings."""
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), ForeignKey("chat_sessions.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # user | assistant | system
    content: Mapped[Text] = mapped_column(Text, nullable=False)
    evidence_badge: Mapped[Optional[str]] = mapped_column(String(32))  # STRONG | PARTIAL | INSUFFICIENT
    refusal_reason: Mapped[Optional[str]] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    session = relationship("ChatSession", back_populates="messages")
    citations = relationship("MessageCitation", back_populates="message", cascade="all, delete-orphan")


class MessageCitation(Base):
    """Resolved citation link from an assistant message sentence to an exact chunk."""
    __tablename__ = "message_citations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    message_id: Mapped[str] = mapped_column(String(64), ForeignKey("chat_messages.id"), nullable=False)
    chunk_id: Mapped[str] = mapped_column(String(64), ForeignKey("chunks.id"), nullable=False)
    document_version_id: Mapped[str] = mapped_column(String(64), ForeignKey("document_versions.id"), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float)

    message = relationship("ChatMessage", back_populates="citations")


class SavedSchemeReminder(Base):
    """Opt-in, privacy-preserving email notification subscription for verified scheme deadlines."""
    __tablename__ = "saved_scheme_reminders"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    scheme_id: Mapped[str] = mapped_column(String(64), ForeignKey("schemes.scheme_id"), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    subscribed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AuditEvent(Base):
    """Immutable audit trail for all administrative state changes."""
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    actor: Mapped[str] = mapped_column(String(128), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)  # source_enable, approve_candidate, approve_rule, etc.
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(64), nullable=False)
    details_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CitizenProfile(Base, TimestampMixin):
    """Citizen demographic, location, socio-economic, and vocational profile.
    
    Serves as the persistent database source of truth for eligibility prefilling,
    citizen dashboard, and one-click re-evaluation.
    """
    __tablename__ = "citizen_profiles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_identifier: Mapped[str] = mapped_column(String(128), default="citizen-default", index=True)
    full_name: Mapped[Optional[str]] = mapped_column(String(255))
    phone: Mapped[Optional[str]] = mapped_column(String(32))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    language: Mapped[str] = mapped_column(String(8), default="hi")

    # Category 1: Personal Information
    age: Mapped[Optional[int]] = mapped_column(Integer)
    gender: Mapped[Optional[str]] = mapped_column(String(32))  # male | female | transgender | other
    marital_status: Mapped[Optional[str]] = mapped_column(String(32))  # unmarried | married | widowed | divorced
    caste_category: Mapped[Optional[str]] = mapped_column(String(32))  # general | obc | sc | st
    minority_status: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    is_differently_abled: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    disability_percentage: Mapped[Optional[int]] = mapped_column(Integer)
    has_disability_certificate: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)

    # Category 2: Residential Information
    state: Mapped[Optional[str]] = mapped_column(String(64))
    district: Mapped[Optional[str]] = mapped_column(String(128))
    pincode: Mapped[Optional[str]] = mapped_column(String(16))
    area_type: Mapped[Optional[str]] = mapped_column(String(32), default="rural")  # rural | urban
    is_rural_resident: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    domicile_status: Mapped[Optional[str]] = mapped_column(String(64))

    # Category 3: Financial Information
    annual_income: Mapped[Optional[float]] = mapped_column(Float)
    is_bpl: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    ration_card_type: Mapped[Optional[str]] = mapped_column(String(32))  # none | apl | bpl | antyodaya
    is_income_tax_payer: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    secc_deprived: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)

    # Category 4: Employment & Occupation
    employment_type: Mapped[Optional[str]] = mapped_column(String(64))  # unemployed | salaried_govt | salaried_private | self_employed | daily_wage | student | retired
    occupation: Mapped[Optional[str]] = mapped_column(String(128))
    is_unorganized_worker: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    is_institutional_landholder: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    is_constitutional_post_holder: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)

    # Category 5: Agricultural Information
    is_farmer: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    owns_cultivable_land: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    landholding_acres: Mapped[Optional[float]] = mapped_column(Float)
    land_ownership_type: Mapped[Optional[str]] = mapped_column(String(64))  # individual | joint | tenant | institutional
    crop_types: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)

    # Category 6: Education
    highest_education: Mapped[Optional[str]] = mapped_column(String(64))  # illiterate | primary | secondary | higher_secondary | diploma | graduate | post_graduate
    is_student: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    current_course: Mapped[Optional[str]] = mapped_column(String(128))
    institution_type: Mapped[Optional[str]] = mapped_column(String(64))
    percentile_score: Mapped[Optional[float]] = mapped_column(Float)
    is_regular_college_student: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)

    # Category 7: Documents & Identification
    has_aadhaar: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    has_jan_dhan_account: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    has_ration_card: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    has_land_records: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    has_income_certificate: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    has_caste_certificate: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    has_pucca_house: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    ekyc_completed: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)

    # Progression and raw answer cache
    completed_steps: Mapped[Optional[List[str]]] = mapped_column(JSON, default=list)
    raw_attributes: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)

    # Relationships
    assessment_responses = relationship("AssessmentResponse", back_populates="profile", cascade="all, delete-orphan")
    assessment_history = relationship("AssessmentHistory", back_populates="profile", cascade="all, delete-orphan")
    saved_schemes = relationship("CitizenSavedScheme", back_populates="profile", cascade="all, delete-orphan")
    applications = relationship("ApplicationTrackerRecord", back_populates="profile", cascade="all, delete-orphan")


class AssessmentResponse(Base, TimestampMixin):
    """In-progress or completed questionnaire response state per citizen."""
    __tablename__ = "assessment_responses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    profile_id: Mapped[str] = mapped_column(String(64), ForeignKey("citizen_profiles.id"), nullable=False)
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32), default="in_progress")  # in_progress | completed
    answers_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

    profile = relationship("CitizenProfile", back_populates="assessment_responses")


class AssessmentHistory(Base):
    """Immutable audit trail of a completed deterministic eligibility evaluation run."""
    __tablename__ = "assessment_history"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    profile_id: Mapped[str] = mapped_column(String(64), ForeignKey("citizen_profiles.id"), nullable=False)
    total_schemes_evaluated: Mapped[int] = mapped_column(Integer, default=0)
    eligible_count: Mapped[int] = mapped_column(Integer, default=0)
    likely_eligible_count: Mapped[int] = mapped_column(Integer, default=0)
    more_info_count: Mapped[int] = mapped_column(Integer, default=0)
    not_eligible_count: Mapped[int] = mapped_column(Integer, default=0)
    counts_json: Mapped[Optional[Dict[str, int]]] = mapped_column(JSON, default=dict)
    ranked_schemes_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    profile = relationship("CitizenProfile", back_populates="assessment_history")


class CitizenSavedScheme(Base, TimestampMixin):
    """Citizen bookmarked scheme with application intent and status."""
    __tablename__ = "citizen_saved_schemes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    profile_id: Mapped[str] = mapped_column(String(64), ForeignKey("citizen_profiles.id"), nullable=False)
    scheme_id: Mapped[str] = mapped_column(String(64), ForeignKey("schemes.scheme_id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="saved")  # saved | applying | applied | beneficiary
    notes: Mapped[Optional[str]] = mapped_column(Text)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    profile = relationship("CitizenProfile", back_populates="saved_schemes")
    scheme = relationship("Scheme")


class ApplicationTrackerRecord(Base, TimestampMixin):
    """End-to-end tracked citizen government scheme application with stage milestones."""
    __tablename__ = "application_tracker_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    profile_id: Mapped[str] = mapped_column(String(64), ForeignKey("citizen_profiles.id"), nullable=False)
    scheme_id: Mapped[str] = mapped_column(String(64), ForeignKey("schemes.scheme_id"), nullable=False)
    application_reference: Mapped[str] = mapped_column(String(128), nullable=False)
    portal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    current_status: Mapped[str] = mapped_column(String(64), default="submitted")  # submitted | under_scrutiny | field_verification | approved | rejected | dbt_released
    submission_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    last_status_update: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    timeline_steps_json: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    remarks: Mapped[Optional[str]] = mapped_column(Text)

    profile = relationship("CitizenProfile", back_populates="applications")
    scheme = relationship("Scheme")


class User(Base, TimestampMixin):
    """User account model for citizen access and administrative authority."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="CITIZEN", index=True)  # CITIZEN | ADMIN
    account_status: Mapped[str] = mapped_column(String(32), default="active")  # active | suspended
    phone: Mapped[Optional[str]] = mapped_column(String(32))
    preferences: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict)
