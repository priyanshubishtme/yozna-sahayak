/**
 * Official Scheme Catalogue Page - Yojana Sahayak
 * Redesigned to Indian Civic Neo-Brutalist Design System
 * Grounded in Official Government PDFs and Gazettes
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  FileText,
  CheckCircle2,
  Building2,
  Sparkles,
  X,
  MapPin,
  Layers,
  Award,
  BookOpen
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SchemeItem } from '../../types';

export const PublicSchemesPage: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [allSchemes, setAllSchemes] = useState<SchemeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');

  // Fetch schemes from authoritative backend
  const fetchSchemes = () => {
    setLoading(true);
    setError(null);
    let url = 'http://127.0.0.1:8005/api/v1/schemes?limit=100';
    if (selectedCategory !== 'all') url += `&category=${encodeURIComponent(selectedCategory)}`;
    if (selectedLevel !== 'all') url += `&level=${encodeURIComponent(selectedLevel)}`;
    if (selectedState !== 'all') url += `&state=${encodeURIComponent(selectedState)}`;
    if (activeQuery.trim()) url += `&q=${encodeURIComponent(activeQuery.trim())}`;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.ok && Array.isArray(data.data)) {
          setAllSchemes(data.data);
        } else {
          throw new Error('Invalid response structure from backend');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch schemes:', err);
        setError('Could not connect to government scheme database at http://127.0.0.1:8005. Please verify backend service.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSchemes();
  }, [selectedCategory, selectedLevel, selectedState, activeQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setActiveQuery('');
  };

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setActiveQuery('');
    setSelectedCategory('all');
    setSelectedLevel('all');
    setSelectedState('all');
  };

  // Dynamic Categories extracted from live data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    allSchemes.forEach(s => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats).sort();
  }, [allSchemes]);

  // Dynamic Live Statistics
  const statistics = useMemo(() => {
    const total = allSchemes.length;
    const central = allSchemes.filter(s => s.level === 'central').length;
    const state = allSchemes.filter(s => s.level === 'state').length;
    const catCount = new Set(allSchemes.map(s => s.category)).size;
    const totalDocs = allSchemes.reduce((acc, s) => acc + (s.document_count || 1), 0);
    return { total, central, state, catCount, totalDocs };
  }, [allSchemes]);

  return (
    <div className="yl" style={{ minHeight: '100vh', background: 'var(--cream, #fff6e5)' }}>
      {/* Hero / Header Section */}
      <section style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'color-mix(in srgb, var(--leaf, #2fbf85) 25%, #fff)',
                border: '2px solid var(--ink, #1b1f3b)',
                fontWeight: 700,
                fontSize: '0.85rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--ink, #1b1f3b)'
              }}
            >
              <ShieldCheck size={16} color="var(--leaf, #2fbf85)" />
              {language === 'hi' ? 'आधिकारिक योजना निर्देशिका' : 'Official Scheme Catalogue'}
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              fontWeight: 800,
              color: 'var(--ink, #1b1f3b)',
              lineHeight: 1.1,
              margin: '6px 0 0',
              fontFamily: '"Baloo 2", Inter, sans-serif'
            }}
          >
            {language === 'hi' ? 'सरकारी कल्याणकारी योजनाएं' : 'Government Welfare Schemes'}
          </h1>

          <p
            style={{
              fontSize: '1.15rem',
              color: 'var(--mute, #454b66)',
              maxWidth: '75ch',
              margin: '0 0 16px',
              lineHeight: 1.5
            }}
          >
            {language === 'hi'
              ? 'सत्यापित मंत्रालय अधिसूचनाओं, राजपत्रों और परिचालन दिशानिर्देशों से संकलित अधिकृत योजनाएं।'
              : 'Authoritative government schemes grounded in verified gazettes and operational guidelines.'}
          </p>

          {/* Dynamic Statistics Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              marginTop: '8px',
              marginBottom: '16px'
            }}
          >
            <div
              style={{
                background: 'var(--card, #fff)',
                border: '2px solid var(--ink, #1b1f3b)',
                borderRadius: '14px',
                padding: '14px 18px',
                boxShadow: '3px 3px 0 var(--ink, #1b1f3b)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mute, #454b66)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Layers size={16} color="var(--leaf, #2fbf85)" />
                {language === 'hi' ? 'सत्यापित योजनाएं' : 'Verified Schemes'}
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink, #1b1f3b)', marginTop: '4px' }}>
                {statistics.total}
              </div>
            </div>

            <div
              style={{
                background: 'var(--card, #fff)',
                border: '2px solid var(--ink, #1b1f3b)',
                borderRadius: '14px',
                padding: '14px 18px',
                boxShadow: '3px 3px 0 var(--ink, #1b1f3b)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mute, #454b66)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Building2 size={16} color="var(--sky, #7aa2ff)" />
                {language === 'hi' ? 'केंद्रीय योजनाएं' : 'Central Schemes'}
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink, #1b1f3b)', marginTop: '4px' }}>
                {statistics.central}
              </div>
            </div>

            <div
              style={{
                background: 'var(--card, #fff)',
                border: '2px solid var(--ink, #1b1f3b)',
                borderRadius: '14px',
                padding: '14px 18px',
                boxShadow: '3px 3px 0 var(--ink, #1b1f3b)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mute, #454b66)', fontSize: '0.85rem', fontWeight: 600 }}>
                <MapPin size={16} color="var(--saf, #ff8a1f)" />
                {language === 'hi' ? 'राज्य स्तरीय योजनाएं' : 'State Schemes'}
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink, #1b1f3b)', marginTop: '4px' }}>
                {statistics.state}
              </div>
            </div>

            <div
              style={{
                background: 'var(--card, #fff)',
                border: '2px solid var(--ink, #1b1f3b)',
                borderRadius: '14px',
                padding: '14px 18px',
                boxShadow: '3px 3px 0 var(--ink, #1b1f3b)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mute, #454b66)', fontSize: '0.85rem', fontWeight: 600 }}>
                <Award size={16} color="var(--leaf, #2fbf85)" />
                {language === 'hi' ? 'विषय श्रेणियां' : 'Categories'}
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink, #1b1f3b)', marginTop: '4px' }}>
                {statistics.catCount}
              </div>
            </div>

            <div
              style={{
                background: 'var(--card, #fff)',
                border: '2px solid var(--ink, #1b1f3b)',
                borderRadius: '14px',
                padding: '14px 18px',
                boxShadow: '3px 3px 0 var(--ink, #1b1f3b)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--mute, #454b66)', fontSize: '0.85rem', fontWeight: 600 }}>
                <BookOpen size={16} color="var(--leaf, #2fbf85)" />
                {language === 'hi' ? 'आधिकारिक दस्तावेज' : 'Official PDFs'}
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--ink, #1b1f3b)', marginTop: '4px' }}>
                {statistics.totalDocs}
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters Main Box */}
        <div
          style={{
            background: 'var(--card, #fff)',
            border: '2px solid var(--ink, #1b1f3b)',
            borderRadius: '18px',
            padding: '20px',
            boxShadow: '5px 5px 0 var(--ink, #1b1f3b)',
            marginTop: '12px'
          }}
        >
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                flex: '1 1 320px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--cream, #fff6e5)',
                border: '2px solid var(--ink, #1b1f3b)',
                borderRadius: '12px',
                padding: '0 14px',
                height: '50px'
              }}
            >
              <Search size={20} color="var(--ink, #1b1f3b)" />
              <input
                type="text"
                placeholder={
                  language === 'hi'
                    ? 'योजना, कीवर्ड, लाभार्थी, या मंत्रालय खोजें...'
                    : 'Search schemes by keyword (e.g. farmer, scholarship, pension)...'
                }
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  color: 'var(--ink, #1b1f3b)',
                  fontWeight: 500
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={18} color="var(--mute, #454b66)" />
                </button>
              )}
            </div>

            <button
              type="submit"
              style={{
                height: '50px',
                padding: '0 24px',
                borderRadius: '12px',
                background: 'var(--leaf, #2fbf85)',
                color: '#1b1f3b',
                border: '2px solid var(--ink, #1b1f3b)',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '2px 2px 0 var(--ink, #1b1f3b)'
              }}
            >
              <Search size={18} />
              {language === 'hi' ? 'खोजें' : 'Search'}
            </button>
          </form>

          {/* Secondary Filter Controls: Jurisdiction & State */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '14px',
              alignItems: 'center',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1.5px dashed color-mix(in srgb, var(--ink, #1b1f3b) 20%, transparent)'
            }}
          >
            {/* Jurisdiction Segmented Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mute, #454b66)' }}>
                {language === 'hi' ? 'अधिकार क्षेत्र:' : 'Jurisdiction:'}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'all', label: language === 'hi' ? 'सभी' : 'All' },
                  { id: 'central', label: language === 'hi' ? 'केंद्र सरकार' : 'Central Govt' },
                  { id: 'state', label: language === 'hi' ? 'राज्य सरकार' : 'State Govt' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedLevel(opt.id);
                      if (opt.id === 'central') setSelectedState('all');
                    }}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: selectedLevel === opt.id ? 800 : 600,
                      border: '2px solid var(--ink, #1b1f3b)',
                      background: selectedLevel === opt.id ? 'var(--saf, #ff8a1f)' : 'var(--cream, #fff6e5)',
                      color: '#1b1f3b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* State Filter Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mute, #454b66)' }}>
                {language === 'hi' ? 'राज्य / संघ क्षेत्र:' : 'State Filter:'}
              </span>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  border: '2px solid var(--ink, #1b1f3b)',
                  background: 'var(--cream, #fff6e5)',
                  color: 'var(--ink, #1b1f3b)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all">{language === 'hi' ? 'सभी राज्य व केंद्र' : 'All States & Central'}</option>
                <option value="central">{language === 'hi' ? 'केवल केंद्रीय योजनाएं' : 'Central Only'}</option>
                <option value="Uttarakhand">{language === 'hi' ? 'उत्तराखंड (Uttarakhand)' : 'Uttarakhand'}</option>
              </select>
            </div>
          </div>

          {/* Dynamic Category Filter Pills */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mute, #454b66)', marginBottom: '8px' }}>
              {language === 'hi' ? 'विषय अनुसार फ़िल्टर करें:' : 'Filter by Category:'}
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px'
              }}
            >
              <button
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: selectedCategory === 'all' ? 800 : 600,
                  border: '2px solid var(--ink, #1b1f3b)',
                  background: selectedCategory === 'all' ? 'var(--leaf, #2fbf85)' : 'var(--cream, #fff6e5)',
                  color: '#1b1f3b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: selectedCategory === 'all' ? '2px 2px 0 var(--ink, #1b1f3b)' : 'none'
                }}
              >
                {language === 'hi' ? 'सभी श्रेणियां' : 'All Categories'}
              </button>

              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    fontWeight: selectedCategory === cat ? 800 : 600,
                    border: '2px solid var(--ink, #1b1f3b)',
                    background: selectedCategory === cat ? 'var(--leaf, #2fbf85)' : 'var(--card, #fff)',
                    color: '#1b1f3b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: selectedCategory === cat ? '2px 2px 0 var(--ink, #1b1f3b)' : 'none'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Active Filter Indicators */}
          {(activeQuery || selectedCategory !== 'all' || selectedLevel !== 'all' || selectedState !== 'all') && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)',
                fontSize: '0.85rem',
                color: 'var(--mute, #454b66)'
              }}
            >
              <span>{language === 'hi' ? 'सक्रिय फ़िल्टर:' : 'Active filters:'}</span>
              {activeQuery && (
                <span
                  style={{
                    background: 'var(--cream, #fff6e5)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--ink, #1b1f3b)',
                    fontWeight: 700
                  }}
                >
                  Query: "{activeQuery}"
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span
                  style={{
                    background: 'var(--cream, #fff6e5)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--ink, #1b1f3b)',
                    fontWeight: 700
                  }}
                >
                  Category: {selectedCategory}
                </span>
              )}
              {selectedLevel !== 'all' && (
                <span
                  style={{
                    background: 'var(--cream, #fff6e5)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--ink, #1b1f3b)',
                    fontWeight: 700
                  }}
                >
                  Jurisdiction: {selectedLevel}
                </span>
              )}
              <button
                onClick={handleResetAllFilters}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: 'var(--rose, #ff7a93)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {language === 'hi' ? 'सभी फ़िल्टर साफ़ करें' : 'Reset all filters'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Scheme Cards Grid Section */}
      <section style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px 60px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div
              style={{
                display: 'inline-block',
                width: '40px',
                height: '40px',
                border: '4px solid var(--cream, #fff6e5)',
                borderTop: '4px solid var(--leaf, #2fbf85)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}
            />
            <p style={{ marginTop: '16px', fontWeight: 600, color: 'var(--mute, #454b66)' }}>
              {language === 'hi' ? 'आधिकारिक योजनाएं लोड हो रही हैं...' : 'Loading verified government schemes...'}
            </p>
          </div>
        ) : error ? (
          <div
            style={{
              background: '#fff0f0',
              border: '2px solid #ff4d4f',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '4px 4px 0 #1b1f3b',
              margin: '20px 0'
            }}
          >
            <p style={{ color: '#d9363e', fontWeight: 700, fontSize: '1.1rem' }}>{error}</p>
            <button
              onClick={fetchSchemes}
              style={{
                marginTop: '12px',
                padding: '8px 20px',
                borderRadius: '8px',
                background: 'var(--leaf, #2fbf85)',
                border: '2px solid var(--ink, #1b1f3b)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : allSchemes.length === 0 ? (
          <div
            style={{
              background: 'var(--card, #fff)',
              border: '2px solid var(--ink, #1b1f3b)',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              boxShadow: '4px 4px 0 var(--ink, #1b1f3b)',
              margin: '20px 0'
            }}
          >
            <FileText size={48} color="var(--mute, #454b66)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--ink, #1b1f3b)', margin: '0 0 8px' }}>
              {language === 'hi' ? 'कोई योजना नहीं मिली' : 'No Matching Schemes Found'}
            </h3>
            <p style={{ color: 'var(--mute, #454b66)', maxWidth: '40ch', margin: '0 auto 20px' }}>
              {language === 'hi'
                ? 'आपके खोज मानदंडों से मेल खाने वाली कोई सरकारी योजना नहीं मिली। कृपया अपने फ़िल्टर रीसेट करें।'
                : 'No government schemes matched your specific search criteria. Please try broader terms or reset filters.'}
            </p>
            <button
              onClick={handleResetAllFilters}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                background: 'var(--leaf, #2fbf85)',
                border: '2px solid var(--ink, #1b1f3b)',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '2px 2px 0 var(--ink, #1b1f3b)'
              }}
            >
              {language === 'hi' ? 'सभी फ़िल्टर रीसेट करें' : 'Reset All Filters'}
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '24px'
            }}
          >
            {allSchemes.map(scheme => {
              const schemeName = language === 'hi' && scheme.name_hi ? scheme.name_hi : scheme.name_en;
              const schemeDesc = language === 'hi' && scheme.description_hi ? scheme.description_hi : scheme.description_en;
              const benefitsSummary = language === 'hi' && scheme.benefits_summary_hi ? scheme.benefits_summary_hi : scheme.benefits_summary_en;

              return (
                <div
                  key={scheme.scheme_id}
                  style={{
                    background: 'var(--card, #fff)',
                    border: '2px solid var(--ink, #1b1f3b)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '4px 4px 0 var(--ink, #1b1f3b)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '6px 6px 0 var(--ink, #1b1f3b)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '4px 4px 0 var(--ink, #1b1f3b)';
                  }}
                >
                  {/* Top Badges Row */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      alignItems: 'center',
                      marginBottom: '12px'
                    }}
                  >
                    {/* Jurisdiction Badge */}
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        border: '1.5px solid var(--ink, #1b1f3b)',
                        background: scheme.level === 'central' ? '#e6f4ea' : '#e8f0fe',
                        color: scheme.level === 'central' ? '#137333' : '#1a73e8',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {scheme.level === 'central'
                        ? (language === 'hi' ? 'केंद्रीय' : 'CENTRAL')
                        : (language === 'hi' ? 'राज्य (उत्तराखंड)' : 'STATE (UK)')}
                    </span>

                    {/* Category Tag */}
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1.5px solid var(--ink, #1b1f3b)',
                        background: 'var(--cream, #fff6e5)',
                        color: 'var(--ink, #1b1f3b)'
                      }}
                    >
                      {scheme.category}
                    </span>

                    {/* Official Gazette Badge */}
                    <span
                      style={{
                        marginLeft: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: 'color-mix(in srgb, var(--leaf, #2fbf85) 15%, transparent)',
                        color: '#0d652d',
                        border: '1px solid #0d652d'
                      }}
                      title="Verified against official circulars and gazettes"
                    >
                      <ShieldCheck size={13} />
                      {language === 'hi' ? 'सत्यापित' : 'PDF Grounded'}
                    </span>
                  </div>

                  {/* Scheme Title & Ministry */}
                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: 'var(--ink, #1b1f3b)',
                      margin: '0 0 6px',
                      lineHeight: 1.25,
                      fontFamily: '"Baloo 2", Inter, sans-serif'
                    }}
                  >
                    {schemeName}
                  </h3>

                  {scheme.ministry_or_dept && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        color: 'var(--mute, #454b66)',
                        marginBottom: '12px',
                        fontWeight: 600
                      }}
                    >
                      <Building2 size={14} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {scheme.ministry_or_dept}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '0.92rem',
                      color: 'var(--mute, #454b66)',
                      lineHeight: 1.45,
                      margin: '0 0 16px',
                      flex: '1 0 auto',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {schemeDesc}
                  </p>

                  {/* Financial & Benefits Highlight Box */}
                  {benefitsSummary && (
                    <div
                      style={{
                        background: 'color-mix(in srgb, var(--leaf, #2fbf85) 12%, #fff)',
                        border: '1.5px solid var(--leaf, #2fbf85)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        marginBottom: '16px'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: '#0d652d',
                          letterSpacing: '0.04em',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Sparkles size={13} />
                        {language === 'hi' ? 'योजना के मुख्य लाभ' : 'Key Scheme Benefits'}
                      </div>
                      <div
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 600,
                          color: 'var(--ink, #1b1f3b)',
                          lineHeight: 1.35
                        }}
                      >
                        {benefitsSummary}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px',
                      marginTop: 'auto',
                      paddingTop: '12px',
                      borderTop: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 12%, transparent)'
                    }}
                  >
                    {/* Full Details Action -> Scheme Detail View */}
                    <Link
                      to={`/schemes/${scheme.scheme_id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '2px solid var(--ink, #1b1f3b)',
                        background: 'var(--card, #fff)',
                        color: 'var(--ink, #1b1f3b)',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--cream, #fff6e5)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--card, #fff)')}
                    >
                      <FileText size={16} />
                      {language === 'hi' ? 'पूर्ण विवरण' : 'Full Details'}
                    </Link>

                    {/* Check Eligibility Action -> Citizen Eligibility Workflow */}
                    <Link
                      to={`/app/eligibility?scheme=${encodeURIComponent(scheme.code)}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '2px solid var(--ink, #1b1f3b)',
                        background: 'var(--leaf, #2fbf85)',
                        color: '#1b1f3b',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                        boxShadow: '2px 2px 0 var(--ink, #1b1f3b)',
                        transition: 'opacity 0.15s ease'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <CheckCircle2 size={16} />
                      {language === 'hi' ? 'पात्रता जांचें' : 'Check Eligibility'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default PublicSchemesPage;
