/**
 * Deterministic Recommendations Result Screen with 4 Status Tiers & Multi-Factor Ranking
 *
 * Enforces Blueprint Section 10.3 & Phase 7 Gate:
 * - 4 deterministic status categories: Eligible, Likely Eligible, Need More Info, Not Eligible.
 * - Multi-factor ranking: Tier > Confidence Mode > Completeness > Verification > Recency.
 * - Full explainability reasons (matched rules with page citations, unmet conditions, missing info).
 * - Direct link to Grounded Chat for scheme inquiries.
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  HelpCircle,
  AlertCircle,
  XCircle,
  Bookmark,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Layers,
  Filter,
  CheckCircle2,
  Info
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { RankedSchemeRecommendation } from '../../types';

export const RecommendationsPage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState<RankedSchemeRecommendation[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({
    'Eligible': 0,
    'Likely Eligible': 0,
    'Need More Information': 0,
    'Not Eligible': 0
  });
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    const s = localStorage.getItem('yojana_saved');
    return s ? JSON.parse(s) : [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load evaluation results from localStorage or re-evaluate
  useEffect(() => {
    const loadResults = async () => {
      const cached = localStorage.getItem('yojana_evaluation_results');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setRecommendations(parsed.ranked_schemes || []);
          setCounts(parsed.counts || {});
          setIsLoading(false);
          return;
        } catch (e) {
          console.error('Failed to parse cached evaluation results:', e);
        }
      }

      // Re-evaluate using saved profile answers or unified citizen profile
      const savedAnswers = localStorage.getItem('yojana_profile_answers');
      const citizenProfile = localStorage.getItem('yojana_citizen_profile');
      let profilePayload: any = {};

      if (citizenProfile) {
        const cp = JSON.parse(citizenProfile);
        profilePayload = {
          age: cp.age,
          state: cp.state,
          district: cp.district,
          occupation: cp.occupation,
          annual_income: cp.annual_family_income || 180000,
          annual_income_band: cp.annual_income_band,
          gender: cp.gender,
          social_category: cp.social_category,
          is_differently_abled: cp.is_differently_abled,
          land_ownership: cp.land_ownership,
          landholding_acres: cp.landholding_acres,
          education_level: cp.education_level
        };
      } else if (savedAnswers) {
        profilePayload = JSON.parse(savedAnswers);
      }

      try {
        const resp = await fetch('http://127.0.0.1:8005/api/v1/eligibility/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: profilePayload })
        });
        if (resp.ok) {
          const json = await resp.json();
          setRecommendations(json.data.ranked_schemes || []);
          setCounts(json.data.counts || {});
          localStorage.setItem('yojana_evaluation_results', JSON.stringify(json.data));
        }
      } catch (err) {
        console.error('Failed to evaluate schemes:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadResults();
  }, []);

  const toggleSave = (schemeId: string) => {
    let updated: string[];
    if (savedIds.includes(schemeId)) {
      updated = savedIds.filter(id => id !== schemeId);
    } else {
      updated = [...savedIds, schemeId];
    }
    setSavedIds(updated);
    localStorage.setItem('yojana_saved', JSON.stringify(updated));
  };

  const getStatusBadge = (tier: string) => {
    switch (tier) {
      case 'Eligible':
        return (
          <span className="badge badge-emerald" style={{ fontWeight: 700, padding: '0.25rem 0.65rem' }}>
            <CheckCircle size={13} style={{ marginRight: '0.3rem' }} />
            ELIGIBLE
          </span>
        );
      case 'Likely Eligible':
        return (
          <span className="badge badge-amber" style={{ fontWeight: 700, padding: '0.25rem 0.65rem' }}>
            <Sparkles size={13} style={{ marginRight: '0.3rem' }} />
            LIKELY ELIGIBLE
          </span>
        );
      case 'Need More Information':
        return (
          <span className="badge badge-blue" style={{ fontWeight: 700, padding: '0.25rem 0.65rem' }}>
            <HelpCircle size={13} style={{ marginRight: '0.3rem' }} />
            NEED MORE INFO
          </span>
        );
      case 'Not Eligible':
      default:
        return (
          <span className="badge badge-danger" style={{ fontWeight: 700, padding: '0.25rem 0.65rem' }}>
            <XCircle size={13} style={{ marginRight: '0.3rem' }} />
            NOT ELIGIBLE
          </span>
        );
    }
  };

  const filteredRecommendations = recommendations.filter(item => {
    if (activeTab === 'ALL') return true;
    return item.tier === activeTab;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1080px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-emerald">
              <ShieldCheck size={14} />
              Deterministic Rule Engine
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {language === 'hi' ? 'कोई एआई मतिभ्रम नहीं' : 'No AI Hallucination'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            {language === 'hi' ? 'आपकी योजना पात्रता परिणाम' : 'Your Scheme Eligibility Recommendations'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            {language === 'hi'
              ? 'आधिकारिक सरकारी दिशानिर्देशों एवं नियमों पर आधारित बहु-कारक क्रमबद्ध परिणाम।'
              : 'Ranked across statutory criteria: Tier priority, confidence mode, completeness, and recency.'}
          </p>
        </div>

        <button
          onClick={() => navigate('/app/eligibility')}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
        >
          <RotateCcw size={15} />
          <span>{language === 'hi' ? 'उत्तर बदलें' : 'Update Profile Answers'}</span>
        </button>
      </div>

      {/* Telemetry Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div
          onClick={() => setActiveTab('Eligible')}
          className="glass-card"
          style={{
            padding: '1.1rem',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--accent-emerald)',
            cursor: 'pointer',
            background: activeTab === 'Eligible' ? 'var(--accent-primary-light)' : undefined
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {language === 'hi' ? 'पूर्णतः पात्र' : 'Fully Eligible'}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
            {counts['Eligible'] || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {language === 'hi' ? 'सभी नियम संतुष्ट' : 'All criteria verified'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('Likely Eligible')}
          className="glass-card"
          style={{
            padding: '1.1rem',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--accent-saffron)',
            cursor: 'pointer',
            background: activeTab === 'Likely Eligible' ? 'rgba(245, 158, 11, 0.1)' : undefined
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {language === 'hi' ? 'संभावित पात्र' : 'Likely Eligible'}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-saffron)', marginTop: '0.2rem' }}>
            {counts['Likely Eligible'] || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {language === 'hi' ? 'सरकारी अभिलेख सत्यापन आवश्यक' : 'Subject to official verification'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('Need More Information')}
          className="glass-card"
          style={{
            padding: '1.1rem',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid #3b82f6',
            cursor: 'pointer',
            background: activeTab === 'Need More Information' ? 'rgba(59, 130, 246, 0.1)' : undefined
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {language === 'hi' ? 'अधिक जानकारी चाहिए' : 'Need More Info'}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.2rem' }}>
            {counts['Need More Information'] || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {language === 'hi' ? 'अतिरिक्त इनपुट आवश्यक' : 'Missing profile criteria'}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('Not Eligible')}
          className="glass-card"
          style={{
            padding: '1.1rem',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--accent-danger)',
            cursor: 'pointer',
            background: activeTab === 'Not Eligible' ? 'rgba(239, 68, 68, 0.1)' : undefined
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {language === 'hi' ? 'अपात्र' : 'Not Eligible'}
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-danger)', marginTop: '0.2rem' }}>
            {counts['Not Eligible'] || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {language === 'hi' ? 'अपात्रता या शर्त अधूरी' : 'Unmet criteria or exception'}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        {['ALL', 'Eligible', 'Likely Eligible', 'Need More Information', 'Not Eligible'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: activeTab === tab ? 'var(--accent-primary)' : 'var(--bg-app)',
              color: activeTab === tab ? '#ffffff' : 'var(--text-secondary)',
              border: `1px solid ${activeTab === tab ? 'var(--accent-primary)' : 'var(--border-normal)'}`,
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            {tab === 'ALL'
              ? (language === 'hi' ? 'सभी योजनाएं' : 'All Schemes')
              : tab}
          </button>
        ))}
      </div>

      {/* Ranked Scheme Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredRecommendations.map((item) => {
          const ev = item.evaluation;
          const isExpanded = expandedScheme === ev.scheme_id;
          const isSaved = savedIds.includes(ev.scheme_id);

          return (
            <div
              key={ev.scheme_id}
              className="glass-card"
              style={{
                padding: '1.5rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all var(--transition-normal)'
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  {/* Rank Pill */}
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-app)',
                      border: '1.5px solid var(--border-normal)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: 'var(--accent-primary)',
                      flexShrink: 0
                    }}
                  >
                    <span>#{item.rank}</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        {language === 'hi' ? ev.scheme_name_hi : ev.scheme_name_en}
                      </h3>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ({ev.scheme_id})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      {getStatusBadge(item.tier)}

                      <span
                        style={{
                          fontSize: '0.7rem',
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.15rem 0.45rem',
                          color: 'var(--text-muted)'
                        }}
                      >
                        Score: {item.score} pts • {item.confidence_mode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bookmark & Expand Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => toggleSave(ev.scheme_id)}
                    className="btn btn-ghost btn-sm"
                    style={{
                      padding: '0.4rem',
                      color: isSaved ? 'var(--accent-saffron)' : 'var(--text-muted)'
                    }}
                    title={isSaved ? 'Remove from Saved' : 'Save Scheme'}
                  >
                    <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={() => setExpandedScheme(isExpanded ? null : ev.scheme_id)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
                  >
                    <span>{isExpanded ? (language === 'hi' ? 'कम देखें' : 'Less') : (language === 'hi' ? 'विस्तृत कारण' : 'Explainability')}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Primary Explainability Reasons */}
              <div
                style={{
                  background: 'var(--bg-app)',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5
                }}
              >
                {language === 'hi'
                  ? (ev.reasons_hi.length > 0 ? ev.reasons_hi.join(' ') : 'पात्रता स्थिति की पुष्टि हो चुकी है।')
                  : (ev.reasons_en.length > 0 ? ev.reasons_en.join(' ') : 'Eligibility status evaluated against registered rules.')}
              </div>

              {/* Collapsible Deep Explainability Section */}
              {isExpanded && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)'
                  }}
                >
                  {/* Matched Rules */}
                  {ev.rules_matched.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <CheckCircle2 size={13} />
                        <span>{language === 'hi' ? 'संतुष्ट पात्रता नियम (Verified Criteria Matched):' : 'Verified Criteria Matched:'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {ev.rules_matched.map((m, mi) => (
                          <div
                            key={mi}
                            style={{
                              background: 'var(--bg-surface-elevated)',
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              fontSize: '0.78rem'
                            }}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              <code>{m.rule_code}</code> (p. {m.page_reference})
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.2rem' }}>
                              "{m.evidence_quote}"
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unmet Rules */}
                  {ev.rules_unmet.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-danger)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <XCircle size={13} />
                        <span>{language === 'hi' ? 'अपात्रता या अधूरी शर्तें (Unmet Criteria):' : 'Unmet Criteria or Exclusions:'}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {ev.rules_unmet.map((u, ui) => (
                          <div
                            key={ui}
                            style={{
                              background: 'rgba(239, 68, 68, 0.05)',
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              fontSize: '0.78rem',
                              color: 'var(--accent-danger)'
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>
                              <code>{u.rule_code}</code> (p. {u.page_reference})
                            </div>
                            <div>{u.unmet_criteria.join(' • ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Information Fields */}
                  {ev.missing_fields.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <HelpCircle size={13} />
                        <span>{language === 'hi' ? 'अतिरिक्त आवश्यक विवरण (Missing Fields for Definitive Verdict):' : 'Missing Fields for Definitive Verdict:'}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {ev.missing_fields.map((f, fi) => (
                          <span
                            key={fi}
                            style={{
                              fontSize: '0.72rem',
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#3b82f6',
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontFamily: 'monospace'
                            }}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multi-Factor Score Breakdown */}
                  <div
                    style={{
                      background: 'var(--bg-app)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <span>Tier Base: <strong>{item.score_breakdown.tier_base}</strong></span>
                    <span>Confidence: <strong>+{item.score_breakdown.confidence_weight}</strong></span>
                    <span>Completeness: <strong>+{item.score_breakdown.completeness}</strong></span>
                    <span>Verification: <strong>+{item.score_breakdown.verification_status}</strong></span>
                    <span>Recency: <strong>+{item.score_breakdown.recency}</strong></span>
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <Link
                  to={`/app/schemes/${ev.scheme_id}`}
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--accent-primary)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <span>{language === 'hi' ? 'योजना का पूरा विवरण' : 'View Scheme Guidelines'}</span>
                  <ArrowRight size={13} />
                </Link>

                <Link
                  to="/app/chat"
                  state={{ prefillScheme: ev.scheme_id }}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
                >
                  <MessageSquare size={13} />
                  <span>{language === 'hi' ? 'इस योजना पर प्रश्न पूछें' : 'Ask AI About This Scheme'}</span>
                </Link>
              </div>
            </div>
          );
        })}

        {filteredRecommendations.length === 0 && !isLoading && (
          <div
            className="glass-card"
            style={{
              padding: '3rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <Info size={32} style={{ color: 'var(--text-muted)' }} />
            <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
              {language === 'hi' ? 'इस श्रेणी में कोई योजना नहीं मिली' : 'No schemes in this category'}
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '400px' }}>
              {language === 'hi' ? 'कृपया अन्य श्रेणी चुनें या प्रश्नावली के उत्तर अपडेट करें।' : 'Select another filter or update your profile questionnaire answers.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

