/**
 * Citizen Scheme Detail View with Interactive Document Checklist,
 * Human-Verified Eligibility Rules, and PDF Coordinate Evidence Viewer (Phase 8).
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  CheckSquare,
  Square,
  FileText,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Sparkles,
  Info,
  Bell,
  X,
  Check,
  Mail
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SchemeItem } from '../../types';
import { LoadingSkeleton, ErrorState } from '../../components/common/StateViews';
import { PdfEvidenceViewerModal } from '../../components/PdfEvidenceViewerModal';

type SchemeDetailData = SchemeItem;

export const CitizenSchemeDetailPage: React.FC = () => {
  const { schemeId } = useParams<{ schemeId: string }>();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [scheme, setScheme] = useState<SchemeDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    const saved = localStorage.getItem('yojana_saved');
    const ids: string[] = saved ? JSON.parse(saved) : [];
    return schemeId ? ids.includes(schemeId) : false;
  });
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`checklist_${schemeId}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Modal State for PDF Coordinate Evidence Viewer
  // Verified Email Deadline Reminder Modal State
  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);
  const [reminderEmail, setReminderEmail] = useState<string>('');
  const [reminderSubmitting, setReminderSubmitting] = useState<boolean>(false);
  const [reminderStatus, setReminderStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSubscribeReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderEmail.trim() || !schemeId) return;
    setReminderSubmitting(true);
    setReminderStatus(null);
    try {
      const res = await fetch('http://127.0.0.1:8005/api/v1/reminders/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: reminderEmail.trim(),
          scheme_id: schemeId,
          preferred_channel: 'email'
        })
      });
      const data = await res.json();
      if (data.ok) {
        setReminderStatus({
          ok: true,
          message: language === 'hi'
            ? 'सत्यापन ईमेल भेज दिया गया है! अनुस्मारक सक्रिय करने के लिए कृपया अपना ईमेल इनबॉक्स जांचें।'
            : 'Double opt-in verification link sent! Please check your inbox to confirm alerts.'
        });
        setReminderEmail('');
      } else {
        setReminderStatus({
          ok: false,
          message: data.error?.message || (language === 'hi' ? 'सदस्यता असफल रही।' : 'Subscription failed.')
        });
      }
    } catch (err) {
      setReminderStatus({
        ok: false,
        message: language === 'hi' ? 'नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।' : 'Network error. Please try again.'
      });
    } finally {
      setReminderSubmitting(false);
    }
  };

    const [activePdfEvidence, setActivePdfEvidence] = useState<{
    versionId: string;
    pageNumber: number;
    title?: string;
    quote?: string;
  } | null>(null);

  const defaultDocuments = [
    { id: 'aadhaar', label_en: 'Aadhaar Card linked to Bank Account', label_hi: 'बैंक खाते से लिंक आधार कार्ड' },
    { id: 'bank_passbook', label_en: 'Bank Passbook with IFSC Code', label_hi: 'बैंक पासबुक (IFSC कोड सहित)' },
    { id: 'land_record', label_en: 'Land Ownership Record / Khasra-Khatauni (for farmers)', label_hi: 'भूमि अभिलेख / खसरा-खतौनी (किसानों हेतु)' },
    { id: 'income_cert', label_en: 'Income Certificate issued by Tehsildar', label_hi: 'तहसीलदार द्वारा जारी आय प्रमाण पत्र' }
  ];

  useEffect(() => {
    fetch(`http://127.0.0.1:8005/api/v1/schemes/${schemeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.data) setScheme(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [schemeId]);

  const toggleSave = () => {
    if (!schemeId) return;
    const saved = localStorage.getItem('yojana_saved');
    let ids: string[] = saved ? JSON.parse(saved) : [];
    if (ids.includes(schemeId)) {
      ids = ids.filter(id => id !== schemeId);
      setIsSaved(false);
    } else {
      ids = [...ids, schemeId];
      setIsSaved(true);
    }
    localStorage.setItem('yojana_saved', JSON.stringify(ids));
  };

  const toggleCheck = (id: string) => {
    const updated = { ...checklist, [id]: !checklist[id] };
    setChecklist(updated);
    localStorage.setItem(`checklist_${schemeId}`, JSON.stringify(updated));
  };

  if (loading) return <LoadingSkeleton count={3} height="140px" />;
  if (!scheme) return <ErrorState title="Scheme Not Found" />;

  const name = language === 'hi' ? scheme.name_hi : scheme.name_en;
  const desc = language === 'hi' ? scheme.description_hi : scheme.description_en;
  const benefits = language === 'hi' ? scheme.benefits_summary_hi : scheme.benefits_summary_en;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1050px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Back Link & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          to="/app/discover"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            fontWeight: 500,
            textDecoration: 'none'
          }}
        >
          <ArrowLeft size={16} />
          {language === 'hi' ? 'योजना सूची पर वापस' : 'Back to Discover'}
        </Link>

        <button
          onClick={toggleSave}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: isSaved ? 'var(--accent-saffron)' : 'var(--text-primary)' }}
        >
          <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
          <span>{isSaved ? (language === 'hi' ? 'सुरक्षित है' : 'Saved') : (language === 'hi' ? 'सुरक्षित करें' : 'Save Scheme')}</span>
        </button>
      </div>

      {/* Main Details Card */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.75rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="badge badge-emerald">
                {scheme.level.toUpperCase()} LEVEL
              </span>
              <span className="badge badge-amber">
                {scheme.category}
              </span>
              {scheme.rules_enabled && (
                <span className="badge badge-blue">
                  <ShieldCheck size={12} />
                  Rules Verified
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>{name}</h1>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{scheme.ministry_or_dept}</div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Link to="/app/eligibility" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} />
              <span>{language === 'hi' ? 'मेरी पात्रता जांचें' : 'Check My Eligibility'}</span>
            </Link>

            <Link
              to="/app/chat"
              state={{ prefillScheme: scheme.scheme_id }}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <MessageSquare size={16} />
              <span>{language === 'hi' ? 'प्रश्न पूछें' : 'Ask in Chat'}</span>
            </Link>

            <button
              onClick={() => setShowReminderModal(true)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              title={language === 'hi' ? 'सत्यापित समय-सीमा अनुस्मारक' : 'Set verified deadline alert'}
            >
              <Bell size={16} />
              <span>{language === 'hi' ? 'अनुस्मारक' : 'Alerts'}</span>
            </button>

                        {scheme.official_portal_url && (
              <a href={scheme.official_portal_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                <ExternalLink size={15} />
              </a>
            )}
          </div>
        </div>

        {/* Benefits Summary Box */}
        {benefits && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary-light)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: 'var(--text-primary)',
              fontSize: '0.92rem',
              lineHeight: 1.5
            }}
          >
            <strong>{language === 'hi' ? 'प्रमुख वित्तीय एवं सामाजिक लाभ:' : 'Key Financial & Welfare Benefits:'}</strong>{' '}
            {benefits}
          </div>
        )}

        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            {language === 'hi' ? 'योजना का आधिकारिक विवरण' : 'Official Scheme Overview'}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>{desc}</p>
        </div>
      </div>

      {/* Human-Verified Statutory Eligibility Rules (Phase 8 Deliverable) */}
      {scheme.active_rules && scheme.active_rules.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-emerald)' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                {language === 'hi' ? 'सत्यापित सांविधिक पात्रता नियम' : 'Human-Verified Statutory Eligibility Rules'}
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {language === 'hi'
                ? 'ये नियम आधिकारिक राजपत्र से उद्धृत हैं। पृष्ठ संख्या पर क्लिक करके मूल पीडीएफ निर्देशांक देखें।'
                : 'Every rule is anchored to an official gazette quote. Click page pill to inspect exact coordinate highlights.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {scheme.active_rules.map(r => (
              <div
                key={r.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <code style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {r.rule_code}
                    </code>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Formula: {r.logic_expression}
                    </span>
                  </div>

                  {/* Clickable PDF Coordinate Highlight Trigger Pill */}
                  {r.document_version_id && (
                    <button
                      onClick={() => setActivePdfEvidence({
                        versionId: r.document_version_id!,
                        pageNumber: r.page_reference,
                        title: scheme.name_en,
                        quote: r.evidence_quote
                      })}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.55rem',
                        color: 'var(--accent-saffron)',
                        borderColor: 'rgba(245, 158, 11, 0.4)'
                      }}
                      title="Inspect PDF coordinate highlight"
                    >
                      <Layers size={13} />
                      <span>Page {r.page_reference} (Highlight)</span>
                    </button>
                  )}
                </div>

                <blockquote
                  style={{
                    borderLeft: '3px solid var(--accent-saffron)',
                    margin: 0,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.82rem',
                    fontStyle: 'italic',
                    color: 'var(--text-primary)',
                    background: 'rgba(245, 158, 11, 0.06)',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
                  }}
                >
                  "{r.evidence_quote}"
                </blockquote>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Verified Documents & Gazettes (Phase 8 Deliverable) */}
      {scheme.verified_documents && scheme.verified_documents.length > 0 && (
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
              {language === 'hi' ? 'सत्यापित सरकारी दस्तावेज़ एवं राजपत्र' : 'Verified Official Gazette Documents'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {language === 'hi'
                ? 'अपरिवर्तनीय रूप से संग्रहीत आधिकारिक परिचालन दिशानिर्देश।'
                : 'Immutably hashed operational guidelines stored in content-addressable storage.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {scheme.verified_documents.map(d => (
              <div
                key={d.version_id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.title}
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  SHA-256: {d.binary_sha256.slice(0, 16)}... • v{d.version_number}
                </div>

                <button
                  onClick={() => setActivePdfEvidence({
                    versionId: d.version_id,
                    pageNumber: 1,
                    title: d.title
                  })}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <Layers size={14} />
                  <span>{language === 'hi' ? 'पीडीएफ साक्ष्य देखें' : 'View PDF Evidence'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Preparation Checklist */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {language === 'hi' ? 'आवेदन दस्तावेज़ चेकलिस्ट' : 'Application Document Checklist'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {language === 'hi'
              ? 'यह चेकलिस्ट आपकी व्यक्तिगत तैयारी के लिए है, सरकारी सत्यापन नहीं।'
              : 'For citizen preparation tracking only. Checking a document is not government approval.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {defaultDocuments.map(doc => {
            const isChecked = !!checklist[doc.id];
            return (
              <button
                key={doc.id}
                onClick={() => toggleCheck(doc.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: isChecked ? 'var(--accent-primary-light)' : 'var(--bg-app)',
                  border: isChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                {isChecked ? (
                  <CheckSquare size={20} style={{ color: 'var(--accent-primary)' }} />
                ) : (
                  <Square size={20} style={{ color: 'var(--text-muted)' }} />
                )}
                <span style={{ fontSize: '0.9rem', fontWeight: isChecked ? 600 : 400 }}>
                  {language === 'hi' ? doc.label_hi : doc.label_en}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* PDF Evidence Coordinate Viewer Modal */}
      {activePdfEvidence && (
        <PdfEvidenceViewerModal
          versionId={activePdfEvidence.versionId}
          initialPage={activePdfEvidence.pageNumber}
          documentTitle={activePdfEvidence.title}
          quoteSnippet={activePdfEvidence.quote}
          onClose={() => setActivePdfEvidence(null)}
        />
      )}
    </div>
  );
};

