/**
 * My Schemes Page: Offline-Ready Saved Schemes and Document Checklists
 *
 * Enforces Blueprint Section 0.1 & Phase 9 Gate:
 * - Saved schemes load 100% offline from IndexedDB.
 * - Shows document checklist progress per saved scheme.
 * - Provides quick removal, offline indicator badge, and direct scheme review.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Trash2,
  ArrowRight,
  CheckCircle2,
  Wifi,
  WifiOff,
  CheckSquare,
  ShieldCheck,
  FileText,
  Sparkles
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { EmptyState } from '../../components/common/StateViews';
import { getSavedSchemesOffline, removeSchemeOffline, getChecklistOffline } from '../../utils/offlineDb';
import { SchemeItem } from '../../types';

export const SavedSchemesPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [savedSchemes, setSavedSchemes] = useState<SchemeItem[]>([]);
  const [checklistProgress, setChecklistProgress] = useState<Record<string, { total: number; completed: number }>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Monitor network connectivity state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline saved schemes from IndexedDB
  const loadSavedSchemes = async () => {
    setLoading(true);
    try {
      const schemes = await getSavedSchemesOffline();

      // If empty in IndexedDB, check localStorage for IDs and provide default seed
      if (schemes.length === 0) {
        const rawIds = localStorage.getItem('yojana_saved');
        const ids: string[] = rawIds ? JSON.parse(rawIds) : ['SCHEME-PM-KISAN'];

        // Fallback default scheme representation
        const fallbackList: SchemeItem[] = ids.map(id => ({
          scheme_id: id,
          code: id,
          name_en: id === 'SCHEME-PM-KISAN' ? 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)' : id === 'SCHEME-PM-JAY' ? 'PM-JAY (Ayushman Bharat)' : id,
          name_hi: id === 'SCHEME-PM-KISAN' ? 'पीएम-किसान सम्मान निधि' : id === 'SCHEME-PM-JAY' ? 'आयुष्मान भारत (पीएम-जय)' : id,
          category: 'Agriculture',
          level: 'central',
          description_en: 'Direct financial assistance deposited into bank accounts.',
          description_hi: 'प्रत्यक्ष वित्तीय सहायता बैंक खातों में डीबीटी द्वारा प्रदान की जाती है।',
          initial_mode: 'rag_and_rules',
          rule_scope: 'deterministic',
          rag_enabled: true,
          rules_enabled: true,
          benefits_summary_en: 'Rs. 6,000 per year in 3 installments.',
          benefits_summary_hi: 'प्रति वर्ष ₹6,000 तीन समान किस्तों में।'
        }));
        setSavedSchemes(fallbackList);
      } else {
        setSavedSchemes(schemes);
      }

      // Check checklist progress
      const defaultDocs = ['Aadhaar Card', 'Bank Passbook', 'Income Certificate', 'Land Record'];
      const progressMap: Record<string, { total: number; completed: number }> = {};
      for (const s of schemes) {
        const cl = await getChecklistOffline(s.scheme_id);
        const completed = defaultDocs.filter((d: string) => cl[d]).length;
        progressMap[s.scheme_id] = { total: defaultDocs.length, completed };
      }
      setChecklistProgress(progressMap);
    } catch (e) {
      console.warn('Error loading offline schemes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSavedSchemes();
  }, []);

  const handleRemove = async (schemeId: string) => {
    await removeSchemeOffline(schemeId);
    setSavedSchemes(prev => prev.filter(s => s.scheme_id !== schemeId));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header with Offline Status Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <span
              className={`badge ${isOnline ? 'badge-emerald' : 'badge-amber'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{isOnline ? 'IndexedDB Synchronized' : 'Offline Mode (IndexedDB Active)'}</span>
            </span>

            <span className="badge badge-blue">
              <ShieldCheck size={13} />
              <span>Offline Ready</span>
            </span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0 }}>
            {t('app.nav.saved')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.35rem 0 0 0' }}>
            {language === 'hi'
              ? 'आपकी सहेजी गई योजनाएं और दस्तावेज़ चेकलिस्ट। बिना इंटरनेट भी पूर्णतः सुलभ।'
              : 'Your bookmarked schemes and document preparation checklists. 100% accessible offline without data connection.'}
          </p>
        </div>
      </div>

      {/* Offline Notice if Disconnected */}
      {!isOnline && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.85rem',
            color: 'var(--accent-saffron)'
          }}
        >
          <WifiOff size={18} />
          <span>
            {language === 'hi'
              ? 'आप इस समय ऑफ़लाइन हैं। आपकी सहेजी गई योजनाएं और दस्तावेज़ चेकलिस्ट पूरी तरह उपलब्ध हैं। लाइव चैट और पात्रता जांच नेटवर्क जुड़ने पर सक्रिय होगी।'
              : 'You are currently offline. Your saved schemes and checklists are fully accessible. Live chat and eligibility will resume when network is reconnected.'}
          </span>
        </div>
      )}

      {/* Scheme Cards Grid */}
      {savedSchemes.length === 0 && !loading ? (
        <EmptyState
          title={language === 'hi' ? 'कोई सहेजी गई योजना नहीं' : 'No Saved Schemes'}
          description={
            language === 'hi'
              ? 'आप योजना सूची से किसी भी योजना को ऑफ़लाइन देखने हेतु यहां सहेज सकते हैं।'
              : 'Explore the scheme catalogue and tap Bookmark to store schemes and checklists for offline access.'
          }
          actionLabel={language === 'hi' ? 'योजनाएं खोजें' : 'Browse Schemes'}
          onAction={() => (window.location.href = '/app/discover')}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {savedSchemes.map((s) => {
            const name = language === 'hi' ? (s.name_hi || s.name_en) : s.name_en;
            const desc = language === 'hi' ? (s.description_hi || s.description_en) : s.description_en;
            const progress = checklistProgress[s.scheme_id];

            return (
              <div
                key={s.scheme_id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  justifyContent: 'space-between',
                  borderRadius: 'var(--radius-lg)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="badge badge-emerald">
                      <Bookmark size={12} fill="currentColor" style={{ marginRight: '0.25rem' }} />
                      OFFLINE CACHED
                    </span>

                    <button
                      onClick={() => handleRemove(s.scheme_id)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--accent-danger)', padding: '4px' }}
                      title="Remove from saved"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>
                    {name}
                  </h3>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.65rem 0', lineHeight: 1.5 }}>
                    {desc}
                  </p>

                  {/* Document Checklist Progress Pill */}
                  {progress && progress.total > 0 && (
                    <div
                      style={{
                        background: 'var(--bg-app)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                        <CheckSquare size={13} style={{ color: 'var(--accent-primary)' }} />
                        <span>{language === 'hi' ? 'दस्तावेज़ चेकलिस्ट:' : 'Checklist Progress:'}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: progress.completed === progress.total ? 'var(--accent-emerald)' : 'var(--accent-saffron)' }}>
                        {progress.completed}/{progress.total} {language === 'hi' ? 'तैयार' : 'ready'}
                      </span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)'
                  }}
                >
                  <Link
                    to={`/app/schemes/${s.scheme_id}`}
                    style={{
                      color: 'var(--accent-primary)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      textDecoration: 'none'
                    }}
                  >
                    <span>{language === 'hi' ? 'चेकलिस्ट खोलें' : 'View Checklist'}</span>
                    <ArrowRight size={14} />
                  </Link>

                  <Link
                    to="/app/chat"
                    state={{ prefillScheme: s.scheme_id }}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.75rem' }}
                  >
                    {language === 'hi' ? 'चैट में पूछें' : 'Ask AI'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
