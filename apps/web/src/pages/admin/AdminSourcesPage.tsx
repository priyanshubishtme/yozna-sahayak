/**
 * Admin Source Registry & Compliance Gate View
 * Real-time compliance verification, policy review dialogs, and Run Now discovery.
 */

import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, CheckCircle, Clock, ExternalLink, Play, 
  Settings, AlertTriangle, RefreshCw, Plus, Lock, CheckCircle2, XCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SourceRecord } from '../../types';
import { LoadingSkeleton } from '../../components/common/StateViews';

export const AdminSourcesPage: React.FC = () => {
  const { t } = useLanguage();
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Review modal state
  const [reviewSource, setReviewSource] = useState<SourceRecord | null>(null);
  const [reviewDecision, setReviewDecision] = useState<string>('approved');
  const [reviewerName, setReviewerName] = useState<string>('chief_compliance_officer');
  const [verifyRobots, setVerifyRobots] = useState<boolean>(false);
  const [writtenAuthRef, setWrittenAuthRef] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');

  const fetchSources = () => {
    setLoading(true);
    fetch('http://127.0.0.1:8005/api/v1/admin/sources')
      .then(res => res.json())
      .then(data => {
        if (data.ok && Array.isArray(data.data)) {
          setSources(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        setStatusMessage({ type: 'error', text: `Failed to load sources: ${err.message}` });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleRunNow = async (sourceId: string) => {
    setActionLoading(`run-${sourceId}`);
    setStatusMessage(null);
    try {
      const res = await fetch(`http://127.0.0.1:8005/api/v1/admin/sources/${sourceId}/discover`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const d = data.data;
        setStatusMessage({
          type: 'success',
          text: `Discovery completed for ${sourceId}: Discovered ${d.pages_discovered} pages, fetched ${d.pages_fetched}, created ${d.candidates_created} candidates.`
        });
        fetchSources();
      } else {
        setStatusMessage({
          type: 'error',
          text: `Run blocked for ${sourceId}: ${data.error?.message || 'Compliance or execution error'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Network error running discovery: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleEnable = async (source: SourceRecord) => {
    const endpoint = source.enabled ? 'disable' : 'enable';
    setActionLoading(`toggle-${source.source_id}`);
    setStatusMessage(null);
    try {
      const res = await fetch(`http://127.0.0.1:8005/api/v1/admin/sources/${source.source_id}/${endpoint}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMessage({
          type: 'success',
          text: `Source ${source.source_id} successfully ${endpoint}d.`
        });
        fetchSources();
      } else {
        setStatusMessage({
          type: 'error',
          text: `Cannot ${endpoint} ${source.source_id}: ${data.error?.message || 'Compliance gate restriction'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error updating source state: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenReview = (s: SourceRecord) => {
    setReviewSource(s);
    setReviewDecision(s.permission_status === 'approved' ? 'approved' : 'approved');
    setReviewerName('chief_compliance_officer');
    setVerifyRobots(false);
    setWrittenAuthRef(s.written_authorization_reference || '');
    setReviewNotes(s.notes || '');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewSource) return;

    setActionLoading('submit-review');
    setStatusMessage(null);
    try {
      const res = await fetch(`http://127.0.0.1:8005/api/v1/admin/sources/${reviewSource.source_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: reviewDecision,
          reviewer: reviewerName,
          verify_robots_txt: verifyRobots,
          written_authorization_reference: writtenAuthRef || undefined,
          notes: reviewNotes
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMessage({
          type: 'success',
          text: `Policy review recorded for ${reviewSource.source_id}: Status is now '${data.data.permission_status}'.`
        });
        setReviewSource(null);
        fetchSources();
      } else {
        setStatusMessage({
          type: 'error',
          text: `Review rejected: ${data.error?.message || 'Compliance violation'}`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error submitting review: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            {t('admin.nav.sources')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Official government registry, human compliance gate, and crawler policy controls.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchSources} title="Refresh Source Registry">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
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

      {/* Strict Compliance Gate Banner */}
      <div
        className="glass-card"
        style={{
          borderLeft: '4px solid var(--accent-saffron)',
          background: 'var(--accent-saffron-light)',
          padding: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <ShieldAlert size={24} style={{ color: 'var(--accent-saffron)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <strong>Blueprint Section 3.3 Compliance Mandate:</strong>
            <ul style={{ margin: '0.4rem 0 0 1.2rem', padding: 0 }}>
              <li><strong>Pending / Prohibited:</strong> Newly registered or prohibited sources cannot run discovery automatically or manually.</li>
              <li><strong>myScheme Restriction:</strong> Terms of Use prohibit automated scrapers without express written authorization. myScheme is strictly locked in <code>disabled</code> mode.</li>
              <li><strong>Audited Runs:</strong> Every discovery run records HTTP fetch attempts, binary hashes, and creates candidates in <code>pending_review</code> status.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Source Cards */}
      {loading ? (
        <LoadingSkeleton count={4} height="140px" />
      ) : sources.length === 0 ? (
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
          No sources registered in the database.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sources.map(s => {
            const isMyScheme = s.source_id === 'SRC-MYSCHEME-DIR';
            const isApproved = s.permission_status === 'approved';
            const canRun = s.can_run_automatically;

            return (
              <div
                key={s.source_id}
                className="glass-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1.25rem',
                  padding: '1.5rem',
                  border: isMyScheme ? '1px dashed var(--accent-danger)' : undefined
                }}
              >
                {/* Left Info Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '640px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="badge badge-muted" style={{ fontWeight: 600 }}>{s.source_family}</span>
                    <span className="badge badge-muted">{s.jurisdiction}</span>
                    <span
                      className={`badge ${
                        isApproved
                          ? 'badge-emerald'
                          : s.permission_status === 'written_authorization_required'
                          ? 'badge-danger'
                          : s.permission_status === 'prohibited'
                          ? 'badge-danger'
                          : 'badge-saffron'
                      }`}
                    >
                      Policy: {s.permission_status}
                    </span>
                    <span className={`badge ${s.enabled ? 'badge-emerald' : 'badge-muted'}`}>
                      {s.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                      {s.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>({s.source_id})</span>
                    </h3>
                    <a
                      href={s.base_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--accent-primary)',
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      {s.base_url} <ExternalLink size={13} />
                    </a>
                  </div>

                  {s.compliance_block_reason && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: isMyScheme ? 'var(--accent-danger)' : 'var(--accent-saffron)',
                        background: 'var(--bg-surface-elevated)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        borderLeft: `3px solid ${isMyScheme ? 'var(--accent-danger)' : 'var(--accent-saffron)'}`
                      }}
                    >
                      <strong>Block Reason:</strong> {s.compliance_block_reason}
                    </div>
                  )}

                  {s.written_authorization_reference && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <CheckCircle size={14} />
                      Written Auth Ref: <code>{s.written_authorization_reference}</code>
                    </div>
                  )}

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>Adapter: <code>{s.adapter_key}</code></span>
                    <span>Cron: <code>{s.schedule_cron}</code></span>
                    {s.last_success_at && (
                      <span style={{ color: 'var(--accent-emerald)' }}>
                        Last Success: {new Date(s.last_success_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action Column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Review Policy Action */}
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleOpenReview(s)}
                      disabled={actionLoading !== null}
                      id={`btn-review-${s.source_id}`}
                    >
                      <Settings size={14} />
                      Review Policy
                    </button>

                    {/* Enable / Disable Action */}
                    <button
                      className={`btn btn-sm ${s.enabled ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleToggleEnable(s)}
                      disabled={actionLoading === `toggle-${s.source_id}`}
                      id={`btn-toggle-${s.source_id}`}
                      style={{
                        opacity: !isApproved && !s.enabled ? 0.7 : 1
                      }}
                      title={!isApproved ? 'Requires policy approval first' : s.enabled ? 'Disable automation' : 'Enable automation'}
                    >
                      {actionLoading === `toggle-${s.source_id}` ? (
                        'Updating...'
                      ) : s.enabled ? (
                        'Disable'
                      ) : (
                        'Enable'
                      )}
                    </button>

                    {/* Run Now Action */}
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleRunNow(s.source_id)}
                      disabled={!canRun || actionLoading === `run-${s.source_id}`}
                      id={`btn-run-${s.source_id}`}
                      title={!canRun ? `Blocked: ${s.compliance_block_reason || 'Compliance gate restriction'}` : 'Trigger manual discovery run now'}
                    >
                      <Play size={14} />
                      {actionLoading === `run-${s.source_id}` ? 'Running...' : 'Run Now'}
                    </button>
                  </div>

                  {!canRun && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      🔒 Compliance lock active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Policy Review Modal */}
      {reviewSource && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
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
                Policy & Compliance Review
              </h2>
              <button
                onClick={() => setReviewSource(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Source: <strong>{reviewSource.name}</strong> ({reviewSource.source_id})
            </div>

            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Compliance Decision
                </label>
                <select
                  value={reviewDecision}
                  onChange={e => setReviewDecision(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                  id="select-review-decision"
                >
                  <option value="approved">Approved (Compliance Verified)</option>
                  <option value="pending_review">Pending Review (Hold)</option>
                  <option value="written_authorization_required">Written Authorization Required</option>
                  <option value="prohibited">Prohibited (Disallowed by Policy/Terms)</option>
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
                  placeholder="e.g. chief_compliance_officer"
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

              {reviewSource.source_id === 'SRC-MYSCHEME-DIR' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--accent-saffron)' }}>
                    Written Authorization Reference (Mandatory for myScheme)
                  </label>
                  <input
                    type="text"
                    value={writtenAuthRef}
                    onChange={e => setWrittenAuthRef(e.target.value)}
                    placeholder="e.g. NIC-MYSCHEME-MOU-2026-OCT"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      borderRadius: '6px'
                    }}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    Per Blueprint Section 3.3, automated discovery on myScheme cannot be enabled without a recorded authorization reference.
                  </small>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Review Notes / Regulatory Justification
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder="Document terms review, ministry circular, or robot policy evaluation notes..."
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                <input
                  type="checkbox"
                  id="chk-verify-robots"
                  checked={verifyRobots}
                  onChange={e => setVerifyRobots(e.target.checked)}
                />
                <label htmlFor="chk-verify-robots" style={{ fontSize: '0.85rem' }}>
                  Trigger live network check of <code>robots.txt</code> during review
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setReviewSource(null)}
                  disabled={actionLoading === 'submit-review'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading === 'submit-review'}
                  id="btn-confirm-review"
                >
                  {actionLoading === 'submit-review' ? 'Recording...' : 'Record Compliance Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

