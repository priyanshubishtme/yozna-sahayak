/**
 * Admin Discovery & Document Review Queue View
 * Human verification, change diffing, scheme assignment, and approval lifecycle.
 */

import React, { useEffect, useState } from 'react';
import { 
  FileCheck, CheckCircle2, XCircle, ArrowRight, ExternalLink, 
  ShieldAlert, RefreshCw, Eye, GitCompare, AlertTriangle, Layers, Filter
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ResourceCandidate, SchemeItem } from '../../types';
import { EmptyState, LoadingSkeleton } from '../../components/common/StateViews';

interface CandidateDetail {
  candidate: ResourceCandidate;
  text_preview: string;
  diff: {
    is_identical: boolean;
    similarity_ratio: number;
    additions_count: number;
    deletions_count: number;
    unified_diff: string;
    sample_changes: string[];
    machine_summary: {
      disclaimer: string;
      bullets: string[];
    };
  } | null;
  impacted_rules: Array<{
    rule_id: string;
    rule_code: string;
    status: string;
    evidence_quote: string;
  }>;
}

export const AdminReviewQueuePage: React.FC = () => {
  const { t } = useLanguage();
  const [candidates, setCandidates] = useState<ResourceCandidate[]>([]);
  const [schemes, setSchemes] = useState<SchemeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('pending_review');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inspection modal state
  const [detailCandidate, setDetailCandidate] = useState<CandidateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Approval modal state
  const [approveTarget, setApproveTarget] = useState<ResourceCandidate | null>(null);
  const [reviewerName, setReviewerName] = useState<string>('chief_compliance_officer');
  const [assignedSchemeId, setAssignedSchemeId] = useState<string>('SCHEME-PM-KISAN');
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('guideline');
  const [approvalNotes, setApprovalNotes] = useState<string>('');

  // Rejection modal state
  const [rejectTarget, setRejectTarget] = useState<ResourceCandidate | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const fetchCandidates = () => {
    setLoading(true);
    const url = activeTab === 'all' 
      ? 'http://127.0.0.1:8005/api/v1/admin/review-queue'
      : `http://127.0.0.1:8005/api/v1/admin/review-queue?status=${activeTab}`;

    Promise.all([
      fetch(url).then(r => r.json()),
      fetch('http://127.0.0.1:8005/api/v1/schemes?limit=50').then(r => r.json())
    ])
      .then(([candData, schemesData]) => {
        if (candData.ok && Array.isArray(candData.data)) {
          setCandidates(candData.data);
        }
        if (schemesData.ok && Array.isArray(schemesData.data)) {
          setSchemes(schemesData.data);
        }
        setLoading(false);
      })
      .catch(err => {
        setStatusMessage({ type: 'error', text: `Failed to load review queue: ${err.message}` });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCandidates();
  }, [activeTab]);

  const handleOpenDetail = async (candidateId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8005/api/v1/admin/review-queue/${candidateId}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setDetailCandidate(data.data);
      } else {
        setStatusMessage({ type: 'error', text: `Could not load candidate details: ${data.error?.message}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Network error: ${err.message}` });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenApprove = (c: ResourceCandidate) => {
    setApproveTarget(c);
    setAssignedSchemeId(c.assigned_scheme_id || (schemes.length > 0 ? schemes[0].scheme_id : 'SCHEME-PM-KISAN'));
    setDocumentTitle(c.title || '');
    setDocumentType('guideline');
    setApprovalNotes('Verified against issuing ministry gazette/portal notification.');
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveTarget) return;

    setActionLoading(`approve-${approveTarget.id}`);
    setStatusMessage(null);
    try {
      const res = await fetch(`http://127.0.0.1:8005/api/v1/admin/review-queue/${approveTarget.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer: reviewerName,
          assigned_scheme_id: assignedSchemeId,
          document_title: documentTitle || undefined,
          document_type: documentType,
          notes: approvalNotes
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMessage({
          type: 'success',
          text: `Document approved! Created DocumentVersion v${data.data.version_number}. ${
            data.data.invalidated_rules_count > 0 
              ? `Flagged ${data.data.invalidated_rules_count} dependent rule(s) for re-review.`
              : 'Staged for coordinate ingestion.'
          }`
        });
        setApproveTarget(null);
        fetchCandidates();
      } else {
        setStatusMessage({
          type: 'error',
          text: `Approval failed: ${data.error?.message || 'Validation error'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error approving candidate: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;

    setActionLoading(`reject-${rejectTarget.id}`);
    setStatusMessage(null);
    try {
      const res = await fetch(`http://127.0.0.1:8005/api/v1/admin/review-queue/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer: reviewerName,
          reason: rejectionReason || 'Candidate rejected during human editorial inspection.'
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMessage({
          type: 'success',
          text: `Candidate ${rejectTarget.id} marked as rejected.`
        });
        setRejectTarget(null);
        fetchCandidates();
      } else {
        setStatusMessage({
          type: 'error',
          text: `Rejection failed: ${data.error?.message || 'Error recording rejection'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error rejecting candidate: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSchemeChange = async (candidateId: string, schemeId: string) => {
    setActionLoading(`assign-${candidateId}`);
    try {
      const res = await fetch(`http://127.0.0.1:8005/api/v1/admin/review-queue/${candidateId}/assign-scheme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheme_id: schemeId })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMessage({ type: 'success', text: `Candidate assigned to ${schemeId}.` });
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, assigned_scheme_id: schemeId } : c));
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error assigning scheme: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = candidates.filter(c => c.review_status === 'pending_review').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            {t('admin.nav.reviewQueue')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Human verification gate, textual diff inspection, scheme linkage, and rule invalidation.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={fetchCandidates} title="Refresh Review Queue">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Live Status Toast */}
      {statusMessage && (
        <div
          className="glass-card"
          style={{
            borderLeft: `4px solid ${statusMessage.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-danger)'}`,
            background: statusMessage.type === 'success' ? 'var(--accent-emerald-light)' : 'rgba(239, 68, 68, 0.1)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 size={20} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
          ) : (
            <XCircle size={20} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            {statusMessage.text}
          </span>
        </div>
      )}

      {/* Review Gate Integrity Banner */}
      <div
        className="glass-card"
        style={{
          borderLeft: '4px solid var(--accent-primary)',
          background: 'var(--accent-primary-light)',
          padding: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <ShieldAlert size={22} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <strong>Phase 3 Gate Rule & Invalidation Mandate:</strong>
            <ul style={{ margin: '0.35rem 0 0 1.2rem', padding: 0 }}>
              <li><strong>Zero Unapproved Evidence:</strong> Discovered candidates are never public or searchable prior to human approval.</li>
              <li><strong>Immutable Versions:</strong> Approving creates a formal <code>DocumentVersion</code> with verified SHA-256 fingerprint.</li>
              <li><strong>Rule Invalidation (Blueprint Section 5.3):</strong> If a new guideline replaces an existing version, all dependent active eligibility rules automatically flip to <code>needs_review</code> until separately re-approved.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        {[
          { key: 'pending_review', label: 'Pending Review' },
          { key: 'approved', label: 'Approved & Verified' },
          { key: 'rejected', label: 'Rejected' },
          { key: 'all', label: 'All Candidates' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontWeight: 600 }}
            id={`tab-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Candidates List */}
      {loading ? (
        <LoadingSkeleton count={3} height="160px" />
      ) : candidates.length === 0 ? (
        <EmptyState
          title={`No candidates in '${activeTab}'`}
          description="Discovered resources will appear here after automated or manual discovery runs."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {candidates.map(c => {
            const isPending = c.review_status === 'pending_review';
            const isApproved = c.review_status === 'approved';
            const isRejected = c.review_status === 'rejected';

            return (
              <div
                key={c.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '1.5rem',
                  borderLeft: `4px solid ${
                    isApproved ? 'var(--accent-emerald)' : isRejected ? 'var(--accent-danger)' : 'var(--accent-saffron)'
                  }`
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxWidth: '750px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-muted" style={{ fontWeight: 600 }}>
                        {c.source_name || c.source_id}
                      </span>
                      <span
                        className={`badge ${
                          isApproved ? 'badge-emerald' : isRejected ? 'badge-danger' : 'badge-saffron'
                        }`}
                      >
                        {c.review_status.toUpperCase()}
                      </span>
                      <span className="badge badge-blue">
                        {c.classification}
                      </span>
                      <span className="badge badge-muted">{c.content_type}</span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.2rem 0' }}>
                      {c.title || 'Official Portal Document Candidate'}
                    </h3>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {c.issuer && <span>Issuer: <strong>{c.issuer}</strong></span>}
                      {c.detected_date && <span>Published: {c.detected_date}</span>}
                      <span>SHA-256: <code style={{ fontSize: '0.75rem' }}>{c.binary_sha256.slice(0, 16)}...</code></span>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleOpenDetail(c.id)}
                      disabled={detailLoading}
                      title="Inspect extracted text snippet and line diff"
                      id={`btn-inspect-${c.id}`}
                    >
                      <GitCompare size={14} />
                      Inspect & Diff
                    </button>

                    {isPending && (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleOpenApprove(c)}
                          disabled={actionLoading !== null}
                          id={`btn-approve-${c.id}`}
                        >
                          <CheckCircle2 size={14} />
                          Approve Document
                        </button>

                        <button
                          className="btn btn-sm"
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--accent-danger)',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                          }}
                          onClick={() => {
                            setRejectTarget(c);
                            setRejectionReason('Spurious or non-authoritative document.');
                          }}
                          disabled={actionLoading !== null}
                          id={`btn-reject-${c.id}`}
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Canonical URL & Scheme Assignment Bar */}
                <div
                  style={{
                    background: 'var(--bg-app)',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.825rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '280px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>URL:</span>
                    <a
                      href={c.canonical_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      {c.canonical_url.slice(0, 75)}... <ExternalLink size={12} />
                    </a>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Scheme:</span>
                    <select
                      value={c.assigned_scheme_id || ''}
                      onChange={e => handleSchemeChange(c.id, e.target.value)}
                      disabled={!isPending || actionLoading !== null}
                      style={{
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.8rem',
                        background: 'var(--bg-surface-elevated)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="">-- Unassigned --</option>
                      {schemes.map(s => (
                        <option key={s.scheme_id} value={s.scheme_id}>
                          {s.name_en} ({s.scheme_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {c.review_notes && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-surface-elevated)', padding: '0.5rem 0.75rem', borderRadius: '4px' }}>
                    <strong>Review Note:</strong> {c.review_notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect & Diff Modal */}
      {detailCandidate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1.5rem'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--bg-surface)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                  Candidate Provenance & Diff Inspector
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {detailCandidate.candidate.title} ({detailCandidate.candidate.id})
                </div>
              </div>
              <button
                onClick={() => setDetailCandidate(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Fingerprints & Classification */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.825rem' }}>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Classification:</span>
                <div style={{ fontWeight: 700, marginTop: '0.2rem', color: 'var(--accent-primary)' }}>
                  {detailCandidate.candidate.classification}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Binary SHA-256:</span>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.2rem', wordBreak: 'break-all' }}>
                  {detailCandidate.candidate.binary_sha256}
                </div>
              </div>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Normalized Text SHA:</span>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', marginTop: '0.2rem', wordBreak: 'break-all' }}>
                  {detailCandidate.candidate.normalized_text_sha256 || 'N/A'}
                </div>
              </div>
            </div>

            {/* Impacted Rules Warning */}
            {detailCandidate.impacted_rules.length > 0 && (
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid var(--accent-saffron)',
                  borderRadius: '6px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-saffron)', fontWeight: 700 }}>
                  <AlertTriangle size={18} />
                  Rule Invalidation Warning (Blueprint Section 5.3)
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-primary)', margin: 0 }}>
                  Approving this candidate as an updated version for <strong>{detailCandidate.candidate.assigned_scheme_id}</strong> will automatically mark the following active eligibility rule(s) as <code>needs_review</code>:
                </p>
                <ul style={{ margin: '0.25rem 0 0 1.2rem', padding: 0, fontSize: '0.8rem' }}>
                  {detailCandidate.impacted_rules.map(r => (
                    <li key={r.rule_id}>
                      <code>{r.rule_code}</code>: &ldquo;{r.evidence_quote}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Machine Diff & Review Aid */}
            {detailCandidate.diff && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                    Line-by-Line Unified Diff
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Similarity: {roundPercent(detailCandidate.diff.similarity_ratio)}% • +{detailCandidate.diff.additions_count} / -{detailCandidate.diff.deletions_count}
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    borderLeft: '3px solid var(--accent-primary)',
                    padding: '0.65rem 0.85rem',
                    fontSize: '0.75rem',
                    borderRadius: '4px'
                  }}
                >
                  <em>{detailCandidate.diff.machine_summary.disclaimer}</em>
                  <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                    {detailCandidate.diff.machine_summary.bullets.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>

                <pre
                  style={{
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    padding: '0.85rem',
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--text-primary)'
                  }}
                >
                  {detailCandidate.diff.unified_diff || 'No textual changes detected (binary identical).'}
                </pre>
              </div>
            )}

            {/* Extracted Text Snippet Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                Extracted Text Preview
              </h3>
              <div
                style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {detailCandidate.text_preview || 'No extractable text snippet recorded.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setDetailCandidate(null)}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approveTarget && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              background: 'var(--bg-surface)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                Approve & Verify Document
              </h2>
              <button
                onClick={() => setApproveTarget(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Approving creates an official, immutable <code>DocumentVersion</code> in verified status.
            </p>

            <form onSubmit={handleConfirmApprove} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Target Scheme
                </label>
                <select
                  value={assignedSchemeId}
                  onChange={e => setAssignedSchemeId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                  id="select-approve-scheme"
                  required
                >
                  {schemes.map(s => (
                    <option key={s.scheme_id} value={s.scheme_id}>
                      {s.name_en} ({s.scheme_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Document Official Title
                </label>
                <input
                  type="text"
                  value={documentTitle}
                  onChange={e => setDocumentTitle(e.target.value)}
                  placeholder="e.g. PM-KISAN Operational Guidelines 2026 Edition"
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={e => setDocumentType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                >
                  <option value="guideline">Operational Guideline</option>
                  <option value="circular">Ministry Circular</option>
                  <option value="notification">Gazette Notification</option>
                  <option value="faq">Official FAQ & Clarifications</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Reviewer Identity
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={e => setReviewerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Review Notes / Audit Remarks
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={e => setApprovalNotes(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setApproveTarget(null)}
                  disabled={actionLoading !== null}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading !== null}
                  id="btn-confirm-approve"
                >
                  {actionLoading ? 'Approving...' : 'Confirm Approval & Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectTarget && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              background: 'var(--bg-surface)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-danger)' }}>
                Reject Candidate Resource
              </h2>
              <button
                onClick={() => setRejectTarget(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Rejection Reason (Audited)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Specify why this candidate is not authoritative or legally valid..."
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRejectTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ background: 'var(--accent-danger)', color: '#fff', border: 'none' }}
                  id="btn-confirm-reject"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function roundPercent(ratio: number): string {
  return (ratio * 100).toFixed(1);
}

