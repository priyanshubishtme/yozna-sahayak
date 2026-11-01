"""Initial schema migration for Yojana Sahayak

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-31 09:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. schemes
    op.create_table(
        'schemes',
        sa.Column('scheme_id', sa.String(64), primary_key=True),
        sa.Column('code', sa.String(64), nullable=False, unique=True),
        sa.Column('name_en', sa.String(255), nullable=False),
        sa.Column('name_hi', sa.String(255), nullable=False),
        sa.Column('short_name', sa.String(64), nullable=True),
        sa.Column('level', sa.String(32), server_default='central', nullable=False),
        sa.Column('ministry_or_dept', sa.String(255), nullable=True),
        sa.Column('category', sa.String(128), nullable=False),
        sa.Column('description_en', sa.Text(), nullable=False),
        sa.Column('description_hi', sa.Text(), nullable=False),
        sa.Column('initial_mode', sa.String(32), server_default='rag_only', nullable=False),
        sa.Column('rule_scope', sa.String(64), server_default='rag_only', nullable=False),
        sa.Column('rag_enabled', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.Column('rules_enabled', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.Column('official_portal_url', sa.String(512), nullable=True),
        sa.Column('benefits_summary_en', sa.Text(), nullable=True),
        sa.Column('benefits_summary_hi', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_schemes_code', 'schemes', ['code'])
    op.create_index('ix_schemes_category', 'schemes', ['category'])

    # 2. sources
    op.create_table(
        'sources',
        sa.Column('source_id', sa.String(64), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('base_url', sa.String(512), nullable=False),
        sa.Column('source_family', sa.String(64), nullable=False),
        sa.Column('jurisdiction', sa.String(32), server_default='IN', nullable=False),
        sa.Column('language_hints', sa.JSON(), nullable=False),
        sa.Column('source_role', sa.String(64), server_default='discovery_and_authoritative_documents', nullable=False),
        sa.Column('adapter_key', sa.String(64), nullable=False),
        sa.Column('fetch_mode', sa.String(32), server_default='requests', nullable=False),
        sa.Column('allowed_content_types', sa.JSON(), nullable=False),
        sa.Column('robots_checked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('terms_checked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('terms_url', sa.String(512), nullable=True),
        sa.Column('permission_status', sa.String(64), server_default='pending_review', nullable=False),
        sa.Column('automation_status', sa.String(32), server_default='disabled', nullable=False),
        sa.Column('written_authorization_reference', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('request_interval_seconds', sa.Integer(), server_default='5', nullable=False),
        sa.Column('max_pages_per_run', sa.Integer(), server_default='20', nullable=False),
        sa.Column('max_download_mb', sa.Integer(), server_default='40', nullable=False),
        sa.Column('schedule_cron', sa.String(64), server_default='0 3 * * *', nullable=False),
        sa.Column('last_success_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_error_code', sa.String(64), nullable=True),
        sa.Column('enabled', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 3. discovery_runs
    op.create_table(
        'discovery_runs',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('source_id', sa.String(64), sa.ForeignKey('sources.source_id'), nullable=False),
        sa.Column('trigger_type', sa.String(32), server_default='scheduled', nullable=False),
        sa.Column('status', sa.String(32), server_default='queued', nullable=False),
        sa.Column('pages_discovered', sa.Integer(), server_default='0', nullable=False),
        sa.Column('pages_fetched', sa.Integer(), server_default='0', nullable=False),
        sa.Column('candidates_created', sa.Integer(), server_default='0', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 4. source_observations
    op.create_table(
        'source_observations',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('source_id', sa.String(64), sa.ForeignKey('sources.source_id'), nullable=False),
        sa.Column('run_id', sa.String(64), sa.ForeignKey('discovery_runs.id'), nullable=True),
        sa.Column('observed_url', sa.String(1024), nullable=False),
        sa.Column('canonical_url', sa.String(1024), nullable=False),
        sa.Column('content_type', sa.String(128), nullable=True),
        sa.Column('etag', sa.String(128), nullable=True),
        sa.Column('last_modified', sa.String(128), nullable=True),
        sa.Column('status', sa.String(32), server_default='discovered', nullable=False),
        sa.Column('discovered_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_source_obs_canonical', 'source_observations', ['canonical_url'])

    # 5. fetch_attempts
    op.create_table(
        'fetch_attempts',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('run_id', sa.String(64), sa.ForeignKey('discovery_runs.id'), nullable=True),
        sa.Column('source_id', sa.String(64), sa.ForeignKey('sources.source_id'), nullable=False),
        sa.Column('url', sa.String(1024), nullable=False),
        sa.Column('http_status', sa.Integer(), nullable=True),
        sa.Column('latency_ms', sa.Float(), nullable=True),
        sa.Column('content_type', sa.String(128), nullable=True),
        sa.Column('content_length', sa.Integer(), nullable=True),
        sa.Column('binary_sha256', sa.String(64), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('fetched_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 6. resource_candidates
    op.create_table(
        'resource_candidates',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('source_id', sa.String(64), sa.ForeignKey('sources.source_id'), nullable=False),
        sa.Column('run_id', sa.String(64), sa.ForeignKey('discovery_runs.id'), nullable=True),
        sa.Column('canonical_url', sa.String(1024), nullable=False),
        sa.Column('original_url', sa.String(1024), nullable=False),
        sa.Column('content_type', sa.String(128), nullable=False),
        sa.Column('binary_sha256', sa.String(64), nullable=False),
        sa.Column('normalized_text_sha256', sa.String(64), nullable=True),
        sa.Column('title', sa.String(512), nullable=True),
        sa.Column('issuer', sa.String(255), nullable=True),
        sa.Column('detected_date', sa.String(64), nullable=True),
        sa.Column('classification', sa.String(32), server_default='new_resource', nullable=False),
        sa.Column('review_status', sa.String(32), server_default='pending_review', nullable=False),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('assigned_scheme_id', sa.String(64), sa.ForeignKey('schemes.scheme_id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index('ix_res_cand_binary_sha', 'resource_candidates', ['binary_sha256'])

    # 7. documents
    op.create_table(
        'documents',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('title', sa.String(512), nullable=False),
        sa.Column('document_type', sa.String(64), server_default='guideline', nullable=False),
        sa.Column('issuer', sa.String(255), nullable=True),
        sa.Column('jurisdiction', sa.String(32), server_default='IN', nullable=False),
        sa.Column('status', sa.String(32), server_default='pending_review', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 8. document_versions
    op.create_table(
        'document_versions',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('document_id', sa.String(64), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('version_number', sa.Integer(), server_default='1', nullable=False),
        sa.Column('binary_sha256', sa.String(64), nullable=False),
        sa.Column('normalized_text_sha256', sa.String(64), nullable=True),
        sa.Column('storage_key', sa.String(512), nullable=False),
        sa.Column('content_type', sa.String(128), server_default='application/pdf', nullable=False),
        sa.Column('content_length', sa.Integer(), server_default='0', nullable=False),
        sa.Column('page_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('source_url', sa.String(1024), nullable=False),
        sa.Column('final_url', sa.String(1024), nullable=True),
        sa.Column('etag', sa.String(128), nullable=True),
        sa.Column('last_modified', sa.String(128), nullable=True),
        sa.Column('status', sa.String(32), server_default='pending_review', nullable=False),
        sa.Column('parser_version', sa.String(32), server_default='pymupdf_v1', nullable=False),
        sa.Column('created_by_job_id', sa.String(64), nullable=True),
        sa.Column('discovered_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('fetched_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ingested_at', sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index('ix_doc_vers_binary_sha', 'document_versions', ['binary_sha256'])

    # 9. scheme_documents
    op.create_table(
        'scheme_documents',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('scheme_id', sa.String(64), sa.ForeignKey('schemes.scheme_id'), nullable=False),
        sa.Column('document_id', sa.String(64), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('is_primary', sa.Boolean(), server_default=sa.text('1'), nullable=False),
        sa.Column('relationship_type', sa.String(64), server_default='governing_guideline', nullable=False)
    )

    # 10. document_reviews
    op.create_table(
        'document_reviews',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('document_version_id', sa.String(64), sa.ForeignKey('document_versions.id'), nullable=False),
        sa.Column('reviewer', sa.String(128), nullable=False),
        sa.Column('decision', sa.String(32), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 11. pages
    op.create_table(
        'pages',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('document_version_id', sa.String(64), sa.ForeignKey('document_versions.id'), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('width', sa.Float(), server_default='595.0', nullable=False),
        sa.Column('height', sa.Float(), server_default='842.0', nullable=False),
        sa.Column('raw_text', sa.Text(), nullable=False),
        sa.Column('ocr_used', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.Column('rotation', sa.Integer(), server_default='0', nullable=False),
        sa.Column('word_count', sa.Integer(), server_default='0', nullable=False)
    )

    # 12. chunks
    op.create_table(
        'chunks',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('document_version_id', sa.String(64), sa.ForeignKey('document_versions.id'), nullable=False),
        sa.Column('page_id', sa.String(64), sa.ForeignKey('pages.id'), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('section_title', sa.String(255), nullable=True),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('token_count', sa.Integer(), server_default='0', nullable=False)
    )

    # 13. chunk_boxes
    op.create_table(
        'chunk_boxes',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('chunk_id', sa.String(64), sa.ForeignKey('chunks.id'), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('x0', sa.Float(), nullable=False),
        sa.Column('y0', sa.Float(), nullable=False),
        sa.Column('x1', sa.Float(), nullable=False),
        sa.Column('y1', sa.Float(), nullable=False),
        sa.Column('text_snippet', sa.Text(), nullable=True)
    )

    # 14. eligibility_rules
    op.create_table(
        'eligibility_rules',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('scheme_id', sa.String(64), sa.ForeignKey('schemes.scheme_id'), nullable=False),
        sa.Column('rule_code', sa.String(64), nullable=False),
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('rule_json', sa.JSON(), nullable=False),
        sa.Column('logic_expression', sa.Text(), nullable=True),
        sa.Column('status', sa.String(32), server_default='pending_review', nullable=False),
        sa.Column('evidence_quote', sa.Text(), nullable=False),
        sa.Column('page_reference', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 15. rule_document_dependencies
    op.create_table(
        'rule_document_dependencies',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('rule_id', sa.String(64), sa.ForeignKey('eligibility_rules.id'), nullable=False),
        sa.Column('document_version_id', sa.String(64), sa.ForeignKey('document_versions.id'), nullable=False),
        sa.Column('chunk_id', sa.String(64), sa.ForeignKey('chunks.id'), nullable=True),
        sa.Column('page_number', sa.Integer(), nullable=True)
    )

    # 16. rule_reviews
    op.create_table(
        'rule_reviews',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('rule_id', sa.String(64), sa.ForeignKey('eligibility_rules.id'), nullable=False),
        sa.Column('reviewer', sa.String(128), nullable=False),
        sa.Column('decision', sa.String(32), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 17. ingestion_jobs
    op.create_table(
        'ingestion_jobs',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('document_version_id', sa.String(64), sa.ForeignKey('document_versions.id'), nullable=False),
        sa.Column('stage', sa.String(64), server_default='extract', nullable=False),
        sa.Column('status', sa.String(32), server_default='queued', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 18. chat_sessions
    op.create_table(
        'chat_sessions',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_language', sa.String(8), server_default='hi', nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 19. chat_messages
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('session_id', sa.String(64), sa.ForeignKey('chat_sessions.id'), nullable=False),
        sa.Column('role', sa.String(16), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('evidence_badge', sa.String(32), nullable=True),
        sa.Column('refusal_reason', sa.String(128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )

    # 20. message_citations
    op.create_table(
        'message_citations',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('message_id', sa.String(64), sa.ForeignKey('chat_messages.id'), nullable=False),
        sa.Column('chunk_id', sa.String(64), sa.ForeignKey('chunks.id'), nullable=False),
        sa.Column('document_version_id', sa.String(64), sa.ForeignKey('document_versions.id'), nullable=False),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=True)
    )

    # 21. saved_scheme_reminders
    op.create_table(
        'saved_scheme_reminders',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('scheme_id', sa.String(64), sa.ForeignKey('schemes.scheme_id'), nullable=False),
        sa.Column('verified', sa.Boolean(), server_default=sa.text('0'), nullable=False),
        sa.Column('token', sa.String(128), unique=True, nullable=False),
        sa.Column('subscribed_at', sa.DateTime(timezone=True), nullable=False)
    )
    op.create_index('ix_saved_reminders_email', 'saved_scheme_reminders', ['email'])

    # 22. audit_events
    op.create_table(
        'audit_events',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('actor', sa.String(128), nullable=False),
        sa.Column('action', sa.String(64), nullable=False),
        sa.Column('resource_type', sa.String(64), nullable=False),
        sa.Column('resource_id', sa.String(64), nullable=False),
        sa.Column('details_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False)
    )


def downgrade() -> None:
    op.drop_table('audit_events')
    op.drop_index('ix_saved_reminders_email', table_name='saved_scheme_reminders')
    op.drop_table('saved_scheme_reminders')
    op.drop_table('message_citations')
    op.drop_table('chat_messages')
    op.drop_table('chat_sessions')
    op.drop_table('ingestion_jobs')
    op.drop_table('rule_reviews')
    op.drop_table('rule_document_dependencies')
    op.drop_table('eligibility_rules')
    op.drop_table('chunk_boxes')
    op.drop_table('chunks')
    op.drop_table('pages')
    op.drop_table('document_reviews')
    op.drop_table('scheme_documents')
    op.drop_index('ix_doc_vers_binary_sha', table_name='document_versions')
    op.drop_table('document_versions')
    op.drop_table('documents')
    op.drop_index('ix_res_cand_binary_sha', table_name='resource_candidates')
    op.drop_table('resource_candidates')
    op.drop_table('fetch_attempts')
    op.drop_index('ix_source_obs_canonical', table_name='source_observations')
    op.drop_table('source_observations')
    op.drop_table('discovery_runs')
    op.drop_table('sources')
    op.drop_index('ix_schemes_category', table_name='schemes')
    op.drop_index('ix_schemes_code', table_name='schemes')
    op.drop_table('schemes')
