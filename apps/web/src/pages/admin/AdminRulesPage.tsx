/**
 * Admin Eligibility Rules Review & Lifecycle Invalidation Console.
 * Full rule tree inspection, verbatim evidence quote verification, and source-change invalidation.
 */

import React, { useEffect, useState } from 'react';
import { 
  Scale, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, 
  Eye, FileText, Plus, BookOpen, Layers, ExternalLink, XCircle, Search, Filter
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LoadingSkeleton, EmptyState } from '../../components/common/StateViews';

interface RuleDependency {
  document_version_id: string;
  version_status: string;
  page_number: number;
}

interface RuleItem {
  id: string;
  scheme_id: string;
  scheme_code: string;
  scheme_name_en: string;
  scheme_name_hi: string;
  rule_code: string;
  version: number;
  status: 'active' | 'needs_review' | 'draft' | 'retired' | 'pending_review';
  logic_expression: string;
  evidence_quote: string;
  page_reference: number;
  dependency: RuleDependency | null;
  reviews_count: number;
  updated_at: string;
  created_at: string;
}

interface RuleSummary {
  total_rules: number;
  active_rules: number;
  needs_review_rules: number;
  draft_rules: number;
  retired_rules: number;
  schemes_count: number;
  schemes: Array<{
    scheme_id: string;
    name_en: string;
    rules_enabled: boolean;
    rag_enabled: boolean;
    initial_mode: string;
  }>;
}

interface RuleDetail extends RuleItem {
  rule_json: any;
  dependencies: Array<{
    id: number;
    document_title: string;
    document_version_id: string;
    version_number: number;
    status: string;
    storage_key: string;
    page_number: number;
  }>;
  reviews: Array<{
    id: string;
    reviewer: string;
    decision: string;
    notes: string;
    reviewed_at: string;
  }>;
}

export const AdminRulesPage: React.FC = () => {
  const { t, language } = useLanguage();
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [summary, setSummary] = useState<RuleSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'needs_review' | 'active' | 'draft' | 'retired'>('all');
  const [selectedScheme, setSelectedScheme] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [inspectRuleId, setInspectRuleId] = useState<string | null>(null);
  const [ruleDetail, setRuleDetail] = useState<RuleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Review Form in Modal
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'request_changes' | 'retire'>('approve');
  const [reviewerName, setReviewerName] = useState<string>('Admin Analyst');
  const [reviewNotes, setReviewNotes] = useState<string>('');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newSchemeId, setNewSchemeId] = useState<string>('SCHEME-PM-KISAN');
  const [newRuleCode, setNewRuleCode] = useState<string>('');
  const [newField, setNewField] = useState<string>('age');
  const [newOp, setNewOp] = useState<string>('greater_than_or_equal');
  const [newValue, setNewValue] = useState<string>('18');
  const [newQuote, setNewQuote] = useState<string>('');
  const [newPage, setNewPage] = useState<number>(1);
  const [newVersionId, setNewVersionId] = useState<string>('ver-doc-pmkisan-gu-v1');

  const fetchRules = () => {
    setLoading(true);
    let url = 'http://127.0.0.1:8005/api/v1/admin/rules';
    const params = new URLSearchParams();
    if (activeTab !== 'all') params.append('status', activeTab);
    if (selectedScheme !== 'all') params.append('scheme_id', selectedScheme);
    if (params.toString()) url += `?${params.toString()}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.ok && Array.isArray(data.data)) {
          setRules(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        setStatusMsg({ type: 'error', text: `Failed to load rules: ${err.message}` });
        setLoading(false);
      });
  };

  const fetchSummary = () => {
    fetch('http://127.0.0.1:8005/api/v1/admin/rules/summary')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setSummary(data.data);
      })
      .catch(err => console.error('Failed to load rules summary:', err));
  };

  useEffect(() => {
    fetchRules();
    fetchSummary();
  }, [activeTab, selectedScheme]);

  const loadRuleDetail = (ruleId: string) => {
    setInspectRuleId(ruleId);
    setDetailLoading(true);
    fetch(`http://127.0.0.1:8005/api/v1/admin/rules/${ruleId}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setRuleDetail(data.data);
          setReviewNotes('');
        }
        setDetailLoading(false);
      })
      .catch(err => {
        setStatusMsg({ type: 'error', text: `Failed to load rule detail: ${err.message}` });
        setDetailLoading(false);
      });
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectRuleId) return;

    setActionLoading(inspectRuleId);
    fetch(`http://127.0.0.1:8005/api/v1/admin/rules/${inspectRuleId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: reviewDecision,
        reviewer: reviewerName,
        notes: reviewNotes || `Decision: ${reviewDecision}`
      })
    })
      .then(res => res.json())
      .then(data => {
        setActionLoading(null);
        if (data.ok) {
          setStatusMsg({
            type: 'success',
            text: `Rule ${data.data.rule_code} updated to '${data.data.status}' via ${data.data.decision}.`
          });
          setInspectRuleId(null);
          setRuleDetail(null);
          fetchRules();
          fetchSummary();
        } else {
          setStatusMsg({ type: 'error', text: data.error?.message || 'Review submission failed' });
        }
      })
      .catch(err => {
        setActionLoading(null);
        setStatusMsg({ type: 'error', text: `Review failed: ${err.message}` });
      });
  };

  const simulateSourceChange = (versionId: string) => {
    setActionLoading(versionId);
    fetch(`http://127.0.0.1:8005/api/v1/admin/rules/simulate-source-change?document_version_id=${encodeURIComponent(versionId)}&reason=annual_gazette_amendment`, {
      method: 'POST'
    })
      .then(res => res.json())
      .then(data => {
        setActionLoading(null);
        if (data.ok) {
          setStatusMsg({
            type: 'success',
            text: `Source change simulated for version ${versionId}! ${data.data.invalidated_rules_count} dependent rules immediately marked as 'needs_review'.`
          });
          fetchRules();
          fetchSummary();
        } else {
          setStatusMsg({ type: 'error', text: data.error?.message || 'Simulation failed' });
        }
      })
      .catch(err => {
        setActionLoading(null);
        setStatusMsg({ type: 'error', text: `Simulation error: ${err.message}` });
      });
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('create');

    const parsedVal = newValue === 'true' ? true : newValue === 'false' ? false : isNaN(Number(newValue)) ? newValue : Number(newValue);

    const payload = {
      scheme_id: newSchemeId,
      rule_code: newRuleCode,
      evidence_quote: newQuote,
      page_reference: Number(newPage),
      document_version_id: newVersionId,
      rule_json: {
        all: [
          {
            field: newField,
            op: newOp,
            value: parsedVal,
            source: {
              document_version_id: newVersionId,
              page_number: Number(newPage),
              quote: newQuote
            }
          }
        ],
        exceptions: []
      }
    };

    fetch('http://127.0.0.1:8005/api/v1/admin/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        setActionLoading(null);
        if (data.ok) {
          setStatusMsg({ type: 'success', text: `Created rule ${data.data.rule_code} in pending_review.` });
          setShowCreateModal(false);
          setNewRuleCode('');
          setNewQuote('');
          fetchRules();
          fetchSummary();
        } else {
          setStatusMsg({ type: 'error', text: data.error?.message || 'Creation failed' });
        }
      })
      .catch(err => {
        setActionLoading(null);
        setStatusMsg({ type: 'error', text: `Failed: ${err.message}` });
      });
  };

  const filteredRules = rules.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.rule_code.toLowerCase().includes(q) ||
      r.scheme_name_en.toLowerCase().includes(q) ||
      r.evidence_quote.toLowerCase().includes(q) ||
      r.logic_expression.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Title & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={28} style={{ color: 'var(--accent-primary)' }} />
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0 }}>
              {language === 'hi' ? 'पात्रता नियम एवं अमान्यीकरण समीक्षा' : 'Eligibility Rules & Invalidation Console'}
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.4rem' }}>
            {language === 'hi'
              ? 'सत्यापित उद्धरण, पृष्ठ संदर्भ, निर्भरता ट्रैकिंग और दस्तावेज़ परिवर्तन पर स्वचालित समीक्षा गेट।'
              : 'Human review, verbatim quote provenance, dependency edges, and automated needs_review invalidation.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => { fetchRules(); fetchSummary(); }}
            title="Refresh rules"
          >
            <RefreshCw size={16} />
            <span>{language === 'hi' ? 'ताज़ा करें' : 'Refresh'}</span>
          </button>

          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            <span>{language === 'hi' ? 'नया नियम जोड़ें' : 'Draft New Rule'}</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="card glass-panel" style={{ padding: '1.1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'hi' ? 'कुल नियम' : 'Total Rules'}
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {summary.total_rules}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Across {summary.schemes_count} initial schemes
            </div>
          </div>

          <div className="card glass-panel" style={{ padding: '1.1rem', borderTop: '3px solid var(--accent-emerald)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              {language === 'hi' ? 'सक्रिय नियम' : 'Active Rules'}
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
              {summary.active_rules}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              100% verified evidence linked
            </div>
          </div>

          <div 
            className="card glass-panel" 
            style={{ 
              padding: '1.1rem', 
              borderTop: summary.needs_review_rules > 0 ? '3px solid var(--accent-saffron)' : '3px solid var(--border-subtle)',
              background: summary.needs_review_rules > 0 ? 'rgba(245, 158, 11, 0.08)' : undefined
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-saffron)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
              {language === 'hi' ? 'समीक्षा आवश्यक' : 'Needs Review'}
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-saffron)', marginTop: '4px' }}>
              {summary.needs_review_rules}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {summary.needs_review_rules > 0 ? 'Source changed; evaluation blocked' : 'Zero invalidated rules'}
            </div>
          </div>

          <div className="card glass-panel" style={{ padding: '1.1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {language === 'hi' ? 'नियम-सक्षम योजनाएं' : 'Rule-Enabled Schemes'}
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {summary.schemes.filter(s => s.rules_enabled).length} / {summary.schemes_count}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              RAG-only for remaining verified
            </div>
          </div>
        </div>
      )}

      {/* Blueprint Gate Principle Callout */}
      <div
        className="glass-card"
        style={{
          borderLeft: '4px solid var(--accent-primary)',
          background: 'rgba(37, 99, 235, 0.06)',
          padding: '1rem 1.25rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ShieldCheck size={22} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            <strong>Blueprint Integrity Mandate (Section 8.1 - 8.4):</strong> Every active eligibility rule must have a human-verified verbatim quote and page reference linked to a current document version. 
            Any source version update immediately flags dependent rules <code>needs_review</code> and disables them from citizen evaluations until re-approved.
          </div>
        </div>
      </div>

      {/* Notifications / Toast */}
      {statusMsg && (
        <div 
          className="glass-card"
          style={{
            padding: '1rem',
            borderLeft: `4px solid ${statusMsg.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-danger)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {statusMsg.type === 'success' ? (
              <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
            ) : (
              <AlertTriangle size={18} style={{ color: 'var(--accent-danger)' }} />
            )}
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{statusMsg.text}</span>
          </div>
          <button 
            onClick={() => setStatusMsg(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 'all', label: language === 'hi' ? 'सभी नियम' : 'All Rules', count: summary?.total_rules },
            { id: 'needs_review', label: language === 'hi' ? 'समीक्षा आवश्यक' : 'Needs Review', count: summary?.needs_review_rules, highlight: true },
            { id: 'active', label: language === 'hi' ? 'सक्रिय' : 'Active', count: summary?.active_rules },
            { id: 'draft', label: language === 'hi' ? 'प्रारूप' : 'Draft', count: summary?.draft_rules },
            { id: 'retired', label: language === 'hi' ? 'सेवानिवृत्त' : 'Retired', count: summary?.retired_rules }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === tab.id 
                  ? tab.highlight && (tab.count || 0) > 0 ? 'var(--accent-saffron)' : 'var(--accent-primary)' 
                  : 'transparent',
                color: activeTab === tab.id 
                  ? '#ffffff' 
                  : tab.highlight && (tab.count || 0) > 0 ? 'var(--accent-saffron)' : 'var(--text-secondary)'
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span 
                  style={{ 
                    fontSize: '0.72rem', 
                    padding: '1px 6px', 
                    borderRadius: '10px', 
                    background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--border-subtle)',
                    color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Scheme Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={selectedScheme}
              onChange={e => setSelectedScheme(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            >
              <option value="all">{language === 'hi' ? 'सभी योजनाएं (13)' : 'All Schemes (13)'}</option>
              {summary?.schemes.map(s => (
                <option key={s.scheme_id} value={s.scheme_id}>
                  {s.name_en} {s.rules_enabled ? '★' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={language === 'hi' ? 'नियम खोजें...' : 'Filter rules...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px 6px 30px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                width: '180px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Rules Table / Cards */}
      {loading ? (
        <LoadingSkeleton />
      ) : filteredRules.length === 0 ? (
        <EmptyState
          title={language === 'hi' ? 'कोई नियम नहीं मिला' : 'No Eligibility Rules Found'}
          description={language === 'hi' ? 'वर्तमान फ़िल्टर के लिए कोई नियम उपलब्ध नहीं है।' : 'No rules match the current status or scheme filter.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredRules.map(rule => (
            <div 
              key={rule.id}
              className="card glass-panel"
              style={{
                padding: '1.25rem',
                borderLeft: rule.status === 'active' 
                  ? '4px solid var(--accent-emerald)'
                  : rule.status === 'needs_review'
                  ? '4px solid var(--accent-saffron)'
                  : '4px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span 
                      style={{ 
                        fontSize: '0.72rem', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: rule.status === 'active' 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : rule.status === 'needs_review'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(148, 163, 184, 0.15)',
                        color: rule.status === 'active'
                          ? 'var(--accent-emerald)'
                          : rule.status === 'needs_review'
                          ? 'var(--accent-saffron)'
                          : 'var(--text-muted)'
                      }}
                    >
                      {rule.status.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      v{rule.version}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {rule.rule_code}
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
                      {rule.scheme_name_en}
                    </span>
                  </div>

                  {/* Logic Expression Formula */}
                  <div style={{ marginTop: '6px', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-primary)', background: 'var(--bg-main)', padding: '6px 10px', borderRadius: '4px' }}>
                    {rule.logic_expression || '(Condition Tree)'}
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {rule.dependency && (
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                      onClick={() => simulateSourceChange(rule.dependency!.document_version_id)}
                      title="Simulates a source gazette amendment to verify automatic invalidation"
                    >
                      <AlertTriangle size={13} style={{ color: 'var(--accent-saffron)' }} />
                      <span>{language === 'hi' ? 'स्रोत अमान्यीकरण टेस्ट' : 'Simulate Source Update'}</span>
                    </button>
                  )}

                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                    onClick={() => loadRuleDetail(rule.id)}
                  >
                    <Eye size={14} />
                    <span>{language === 'hi' ? 'समीक्षा व विवरण' : 'Inspect & Review'}</span>
                  </button>
                </div>
              </div>

              {/* Verified Verbatim Quote Box */}
              <div 
                style={{ 
                  marginTop: '0.85rem', 
                  padding: '10px 14px', 
                  borderRadius: '6px', 
                  background: 'var(--bg-main)',
                  borderLeft: '3px solid var(--accent-info)',
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  color: 'var(--text-primary)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontStyle: 'normal', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <BookOpen size={12} />
                    {language === 'hi' ? 'सत्यापित आधिकारिक उद्धरण' : 'Verified Gazette Quote'}
                  </span>
                  {rule.dependency && (
                    <span style={{ fontSize: '0.72rem', fontStyle: 'normal', padding: '1px 6px', borderRadius: '4px', background: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      Page {rule.page_reference} • {rule.dependency.document_version_id} ({rule.dependency.version_status})
                    </span>
                  )}
                </div>
                "{rule.evidence_quote}"
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect & Review Modal */}
      {inspectRuleId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
          onClick={() => { setInspectRuleId(null); setRuleDetail(null); }}
        >
          <div
            className="card glass-panel"
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              background: 'var(--bg-card)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {detailLoading || !ruleDetail ? (
              <LoadingSkeleton />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-primary">{ruleDetail.scheme_code}</span>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                        {ruleDetail.rule_code}
                      </h2>
                      <span className="badge badge-muted">Version {ruleDetail.version}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {ruleDetail.scheme_name_en} ({ruleDetail.scheme_name_hi})
                    </div>
                  </div>

                  <button
                    onClick={() => { setInspectRuleId(null); setRuleDetail(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <XCircle size={22} />
                  </button>
                </div>

                {/* Status Alert Banner */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    background: ruleDetail.status === 'active' 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : ruleDetail.status === 'needs_review'
                      ? 'rgba(245, 158, 11, 0.12)'
                      : 'var(--bg-main)',
                    borderLeft: ruleDetail.status === 'active'
                      ? '4px solid var(--accent-emerald)'
                      : ruleDetail.status === 'needs_review'
                      ? '4px solid var(--accent-saffron)'
                      : '4px solid var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {ruleDetail.status === 'active' ? (
                    <CheckCircle2 size={18} style={{ color: 'var(--accent-emerald)' }} />
                  ) : (
                    <AlertTriangle size={18} style={{ color: 'var(--accent-saffron)' }} />
                  )}
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>Status: {ruleDetail.status.toUpperCase()}</strong> —{' '}
                    {ruleDetail.status === 'active'
                      ? 'This rule is currently active in deterministic Python citizen evaluation.'
                      : ruleDetail.status === 'needs_review'
                      ? 'Source document updated or changes requested. Blocked from live evaluation until re-approved.'
                      : 'Draft or retired state.'}
                  </div>
                </div>

                {/* Logic Formula */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Deterministic Logic Formula
                  </div>
                  <pre style={{ margin: 0, padding: '10px', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--accent-primary)', overflowX: 'auto' }}>
                    {ruleDetail.logic_expression}
                  </pre>
                </div>

                {/* Document Provenance & Verified Quote */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Verified Verbatim Gazette Evidence
                  </div>
                  <div style={{ padding: '12px', background: 'var(--bg-main)', borderRadius: '6px', borderLeft: '3px solid var(--accent-info)', fontStyle: 'italic', fontSize: '0.88rem' }}>
                    "{ruleDetail.evidence_quote}"
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span><strong>Page Reference:</strong> Page {ruleDetail.page_reference}</span>
                    {ruleDetail.dependencies.length > 0 && (
                      <span><strong>Document Version:</strong> {ruleDetail.dependencies[0].document_version_id} ({ruleDetail.dependencies[0].status})</span>
                    )}
                  </div>
                </div>

                {/* Condition Tree JSON Preview */}
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                    Structured Rule Tree JSON
                  </div>
                  <pre style={{ margin: 0, padding: '10px', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-primary)', maxHeight: '150px', overflowY: 'auto' }}>
                    {JSON.stringify(ruleDetail.rule_json, null, 2)}
                  </pre>
                </div>

                {/* Review Audit History */}
                {ruleDetail.reviews.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Audit History ({ruleDetail.reviews.length} decisions)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                      {ruleDetail.reviews.map(rev => (
                        <div key={rev.id} style={{ fontSize: '0.78rem', padding: '6px 10px', borderRadius: '4px', background: 'var(--bg-main)', display: 'flex', justifyContent: 'space-between' }}>
                          <span><strong>{rev.reviewer}:</strong> {rev.decision.toUpperCase()} — {rev.notes}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(rev.reviewed_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Human Review Decision Form */}
                <form onSubmit={handleReviewSubmit} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    Record Human Policy Verification Decision
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Decision Action
                      </label>
                      <select
                        value={reviewDecision}
                        onChange={e => setReviewDecision(e.target.value as any)}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                      >
                        <option value="approve">Approve & Activate Rule (Passes Gate)</option>
                        <option value="request_changes">Request Changes (Set Needs Review)</option>
                        <option value="retire">Retire Rule (Deactivate)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        Reviewer Identity
                      </label>
                      <input
                        type="text"
                        value={reviewerName}
                        onChange={e => setReviewerName(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Review Notes & Justification
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={e => setReviewNotes(e.target.value)}
                      placeholder="Notes on verified quote accuracy, page coordinates, and unit definitions..."
                      rows={2}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-primary)', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setInspectRuleId(null); setRuleDetail(null); }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={actionLoading !== null}
                    >
                      Submit Review Decision
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create New Rule Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem'
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="card glass-panel"
            style={{
              width: '100%',
              maxWidth: '650px',
              padding: '1.75rem',
              background: 'var(--bg-card)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                {language === 'hi' ? 'नया पात्रता नियम तैयार करें' : 'Draft New Eligibility Rule'}
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Target Scheme
                  </label>
                  <select
                    value={newSchemeId}
                    onChange={e => setNewSchemeId(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                  >
                    {summary?.schemes.map(s => (
                      <option key={s.scheme_id} value={s.scheme_id}>{s.name_en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Rule Code (Unique)
                  </label>
                  <input
                    type="text"
                    value={newRuleCode}
                    onChange={e => setNewRuleCode(e.target.value)}
                    placeholder="e.g. PMKISAN-R04-AGE"
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Condition Leaf Inputs */}
              <div style={{ padding: '10px', background: 'var(--bg-main)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>Atomic Condition</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="field (e.g. age)"
                    value={newField}
                    onChange={e => setNewField(e.target.value)}
                    required
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  />
                  <select
                    value={newOp}
                    onChange={e => setNewOp(e.target.value)}
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  >
                    <option value="equals">equals (==)</option>
                    <option value="greater_than_or_equal">&gt;=</option>
                    <option value="less_than_or_equal">&lt;=</option>
                    <option value="not_equals">!=</option>
                  </select>
                  <input
                    type="text"
                    placeholder="value"
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    required
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              {/* Verbatim Quote (Mandatory Gate) */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Verbatim Official Evidence Quote (Mandatory)
                </label>
                <textarea
                  value={newQuote}
                  onChange={e => setNewQuote(e.target.value)}
                  placeholder="Exact quote from official gazette operational guidelines..."
                  required
                  rows={2}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Page Reference
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newPage}
                    onChange={e => setNewPage(Number(e.target.value))}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Document Version ID
                  </label>
                  <input
                    type="text"
                    value={newVersionId}
                    onChange={e => setNewVersionId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading !== null}>
                  Save Draft Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

