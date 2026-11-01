/**
 * Citizen Scheme Discovery View with Category Pills, Search & Real-Time Filtering
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, Bookmark, ArrowRight, ShieldCheck, Sparkles, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SchemeItem } from '../../types';
import { LoadingSkeleton, EmptyState } from '../../components/common/StateViews';

export const CitizenDiscoverPage: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [schemes, setSchemes] = useState<SchemeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    const s = localStorage.getItem('yojana_saved');
    return s ? JSON.parse(s) : [];
  });

  useEffect(() => {
    fetch('http://127.0.0.1:8005/api/v1/schemes?limit=50')
      .then(res => res.json())
      .then(data => {
        if (data.ok && Array.isArray(data.data)) {
          setSchemes(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

  const categories = [
    'ALL',
    'Agriculture',
    'Health',
    'Housing',
    'Education',
    'Social Welfare',
    'Energy'
  ];

  const filteredSchemes = schemes.filter(s => {
    const text = `${s.name_en} ${s.name_hi} ${s.category} ${s.description_en} ${s.description_hi}`.toLowerCase();
    const matchesText = text.includes(filter.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || s.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesText && matchesCategory;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
          <span className="badge badge-emerald">
            <ShieldCheck size={13} />
            Verified Scheme Directory
          </span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
          {language === 'hi' ? 'कल्याणकारी योजनाएं खोजें' : 'Discover Welfare Schemes'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '0.3rem' }}>
          {language === 'hi'
            ? 'अपनी पसंद और आवश्यकता के अनुसार सत्यापित योजनाएं खोजें, पात्रता जांचें और विवरण देखें।'
            : 'Explore official welfare schemes, verified eligibility criteria, and operational guidelines.'}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="glass-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.25rem',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 1rem',
            background: 'var(--bg-app)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-normal)'
          }}
        >
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={language === 'hi' ? 'योजना का नाम, मंत्रालय या कीवर्ड खोजें...' : 'Search scheme by name, ministry, or keyword...'}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.95rem'
            }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                background: selectedCategory === cat ? 'var(--accent-primary)' : 'var(--bg-app)',
                color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                border: `1px solid ${selectedCategory === cat ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
            >
              {cat === 'ALL' ? (language === 'hi' ? 'सभी श्रेणियां' : 'All Categories') : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Schemes Grid */}
      {loading ? (
        <LoadingSkeleton count={4} height="160px" />
      ) : filteredSchemes.length === 0 ? (
        <EmptyState
          title="No Schemes Found"
          description="Try modifying your search or category filter."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredSchemes.map(s => {
            const isSaved = savedIds.includes(s.scheme_id);
            return (
              <div
                key={s.scheme_id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  justifyContent: 'space-between',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>{s.level.toUpperCase()}</span>
                      <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>{s.category}</span>
                    </div>

                    <button
                      onClick={() => toggleSave(s.scheme_id)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.2rem', color: isSaved ? 'var(--accent-saffron)' : 'var(--text-muted)' }}
                      title={isSaved ? 'Saved' : 'Save Scheme'}
                    >
                      <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
                    {language === 'hi' ? s.name_hi : s.name_en}
                  </h3>

                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {language === 'hi' ? s.description_hi : s.description_en}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)',
                    gap: '0.5rem'
                  }}
                >
                  <Link
                    to={`/app/schemes/${s.scheme_id}`}
                    style={{
                      color: 'var(--accent-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      textDecoration: 'none'
                    }}
                  >
                    <span>{language === 'hi' ? 'विवरण देखें' : 'View Details'}</span>
                    <ArrowRight size={13} />
                  </Link>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <Link
                      to="/app/chat"
                      state={{ prefillScheme: s.scheme_id }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.35rem 0.65rem' }}
                      title="Ask Grounded AI"
                    >
                      <MessageSquare size={13} />
                    </Link>

                    <Link
                      to="/app/eligibility"
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                    >
                      {language === 'hi' ? 'पात्रता' : 'Eligible?'}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

