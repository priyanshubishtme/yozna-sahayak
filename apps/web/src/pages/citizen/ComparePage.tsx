/**
 * Scheme Side-by-Side Comparison Interface - Yojana Sahayak
 * Redesigned to Indian Civic Neo-Brutalist Design System
 * Features Multi-Scheme Search, Deterministic Comparison, and Gazette Provenance
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Check,
  X,
  ShieldCheck,
  ExternalLink,
  Search,
  Building2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Download,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronRight,
  BookOpen,
  Plus
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SchemeItem } from '../../types';

export const ComparePage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // All available schemes loaded from authoritative backend
  const [allSchemes, setAllSchemes] = useState<SchemeItem[]>([]);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Selected Scheme IDs for comparison (max 3)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Compared schemes data (full records)
  const [comparedSchemes, setComparedSchemes] = useState<SchemeItem[]>([]);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonActive, setComparisonActive] = useState<boolean>(false);

  // Search & Filter within the selector panel
  const [selectorSearch, setSelectorSearch] = useState<string>('');
  const [selectorCategory, setSelectorCategory] = useState<string>('all');

  const comparisonTableRef = useRef<HTMLDivElement>(null);

  // 1. Fetch available schemes from backend
  useEffect(() => {
    const loadSchemes = async () => {
      setIsLoadingSchemes(true);
      setFetchError(null);
      try {
        const resp = await fetch('http://127.0.0.1:8005/api/v1/schemes?limit=100');
        if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
        const json = await resp.json();

        // Fix root cause: json.data is an array directly, not json.data.schemes!
        const items: SchemeItem[] = Array.isArray(json.data) ? json.data : [];
        setAllSchemes(items);

        // Read initial selection from URL params if present, else default to PM-KISAN & PM-JAY
        const paramSchemes = searchParams.get('schemes');
        if (paramSchemes) {
          const ids = paramSchemes.split(',').map(s => s.trim()).filter(Boolean).slice(0, 3);
          if (ids.length >= 2) {
            setSelectedIds(ids);
            triggerComparison(ids);
          } else {
            setSelectedIds(ids);
          }
        } else if (items.length >= 2) {
          const defaults = [items[0].scheme_id, items[1].scheme_id];
          setSelectedIds(defaults);
        }
      } catch (err: any) {
        console.error('Failed to load schemes for comparison:', err);
        setFetchError('Could not load schemes from backend at http://127.0.0.1:8005.');
      } finally {
        setIsLoadingSchemes(false);
      }
    };

    loadSchemes();
  }, []);

  // 2. Fetch full comparison data for selected schemes
  const triggerComparison = async (ids: string[]) => {
    if (ids.length < 2) return;
    setIsComparing(true);
    try {
      const resp = await fetch(`http://127.0.0.1:8005/api/v1/schemes/compare/batch?ids=${ids.join(',')}`);
      if (resp.ok) {
        const json = await resp.json();
        if (json.data && Array.isArray(json.data.compared_schemes)) {
          setComparedSchemes(json.data.compared_schemes);
          setComparisonActive(true);
          // Sync URL search params
          setSearchParams({ schemes: ids.join(',') });
          return;
        }
      }
      // Fallback: match locally from allSchemes
      const localMatches = allSchemes.filter(s => ids.includes(s.scheme_id));
      setComparedSchemes(localMatches);
      setComparisonActive(true);
      setSearchParams({ schemes: ids.join(',') });
    } catch (e) {
      console.warn('Batch comparison API error, using local scheme records:', e);
      const localMatches = allSchemes.filter(s => ids.includes(s.scheme_id));
      setComparedSchemes(localMatches);
      setComparisonActive(true);
    } finally {
      setIsComparing(false);
    }
  };

  // Selection interactions
  const handleToggleScheme = (schemeId: string) => {
    if (selectedIds.includes(schemeId)) {
      setSelectedIds(prev => prev.filter(id => id !== schemeId));
      setComparisonActive(false);
    } else {
      if (selectedIds.length < 3) {
        setSelectedIds(prev => [...prev, schemeId]);
        setComparisonActive(false);
      }
    }
  };

  const handleRemoveScheme = (schemeId: string) => {
    const updated = selectedIds.filter(id => id !== schemeId);
    setSelectedIds(updated);
    if (updated.length >= 2 && comparisonActive) {
      triggerComparison(updated);
    } else {
      setComparisonActive(false);
    }
  };

  const handleClearAll = () => {
    setSelectedIds([]);
    setComparedSchemes([]);
    setComparisonActive(false);
    setSearchParams({});
  };

  const handleCompareClick = () => {
    if (selectedIds.length >= 2) {
      triggerComparison(selectedIds);
      setTimeout(() => {
        comparisonTableRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Available categories for selector
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    allSchemes.forEach(s => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats).sort();
  }, [allSchemes]);

  // Filter schemes inside selector browser
  const filteredAvailableSchemes = useMemo(() => {
    return allSchemes.filter(s => {
      const matchCat = selectorCategory === 'all' || s.category === selectorCategory;
      const q = selectorSearch.toLowerCase().trim();
      if (!q) return matchCat;

      const nameEn = (s.name_en || '').toLowerCase();
      const nameHi = (s.name_hi || '').toLowerCase();
      const ministry = (s.ministry_or_dept || '').toLowerCase();
      const cat = (s.category || '').toLowerCase();

      return matchCat && (nameEn.includes(q) || nameHi.includes(q) || ministry.includes(q) || cat.includes(q));
    });
  }, [allSchemes, selectorSearch, selectorCategory]);

  // Intelligent Comparative Insights Calculation
  const comparativeInsights = useMemo(() => {
    if (comparedSchemes.length < 2) return null;

    // Categories
    const categories = Array.from(new Set(comparedSchemes.map(s => s.category)));

    // Document overlap
    const docLists = comparedSchemes.map(s => s.required_documents || []);
    const sharedDocs = docLists.length > 0
      ? docLists[0].filter(d => docLists.every(list => list.includes(d)))
      : [];

    return {
      totalCompared: comparedSchemes.length,
      categories,
      sharedDocs
    };
  }, [comparedSchemes]);

  return (
    <div className="yl" style={{ minHeight: '100vh', background: 'var(--cream, #fff6e5)' }}>
      {/* 1. Header / Page Introduction */}
      <section style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 20px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              {language === 'hi' ? 'सत्यापित योजना तुलना' : 'Verified Comparison'}
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 3.8vw, 3rem)',
              fontWeight: 800,
              color: 'var(--ink, #1b1f3b)',
              lineHeight: 1.15,
              margin: '6px 0 0',
              fontFamily: '"Baloo 2", Inter, sans-serif'
            }}
          >
            {language === 'hi' ? 'योजनाओं की परस्पर तुलना' : 'Scheme Side-by-Side Comparison'}
          </h1>

          <p
            style={{
              fontSize: '1.1rem',
              color: 'var(--mute, #454b66)',
              maxWidth: '80ch',
              margin: '0 0 16px',
              lineHeight: 1.5
            }}
          >
            {language === 'hi'
              ? 'पात्रता मानदंडों, वित्तीय लाभों, आवश्यक दस्तावेजों और आवेदन प्रक्रियाओं की आधिकारिक तुलना करें।'
              : 'Compare eligibility criteria, financial benefits, required documents, and application processes across government schemes.'}
          </p>
        </div>

        {/* 2. Scheme Selection Main Panel */}
        <div
          style={{
            background: 'var(--card, #fff)',
            border: '2px solid var(--ink, #1b1f3b)',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '5px 5px 0 var(--ink, #1b1f3b)',
            marginTop: '12px'
          }}
        >
          {/* Header of Selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: 'var(--ink, #1b1f3b)',
                  margin: 0,
                  fontFamily: '"Baloo 2", Inter, sans-serif'
                }}
              >
                {language === 'hi' ? 'तुलना हेतु योजनाएं चुनें' : 'Select Schemes to Compare'}
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--mute, #454b66)', margin: '4px 0 0' }}>
                {language === 'hi'
                  ? 'पात्रता, लाभ और शर्तों की तुलना के लिए अधिकतम 3 सरकारी योजनाएं चुनें।'
                  : 'Choose up to 3 government schemes to compare their eligibility, benefits, and requirements.'}
              </p>
            </div>

            {/* Selection Status & Clear Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  border: '1.5px solid var(--ink, #1b1f3b)',
                  background: selectedIds.length >= 2 ? 'var(--leaf, #2fbf85)' : 'var(--cream, #fff6e5)',
                  color: '#1b1f3b'
                }}
              >
                {selectedIds.length} / 3 Schemes Selected
              </span>

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--rose, #ff7a93)',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {language === 'hi' ? 'सभी हटाएं' : 'Clear All'}
                </button>
              )}
            </div>
          </div>

          {/* Visual Selected Scheme Slots (3 Slots) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '14px',
              marginBottom: '20px'
            }}
          >
            {[0, 1, 2].map(slotIndex => {
              const schemeId = selectedIds[slotIndex];
              const schemeObj = allSchemes.find(s => s.scheme_id === schemeId);

              if (schemeObj) {
                const sName = language === 'hi' && schemeObj.name_hi ? schemeObj.name_hi : schemeObj.name_en;
                return (
                  <div
                    key={schemeObj.scheme_id}
                    style={{
                      background: 'var(--cream, #fff6e5)',
                      border: '2px solid var(--ink, #1b1f3b)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: '3px 3px 0 var(--ink, #1b1f3b)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            border: '1px solid var(--ink, #1b1f3b)',
                            background: schemeObj.level === 'central' ? '#e6f4ea' : '#e8f0fe',
                            color: schemeObj.level === 'central' ? '#137333' : '#1a73e8'
                          }}
                        >
                          {schemeObj.level.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--mute, #454b66)' }}>
                          Slot {slotIndex + 1}
                        </span>
                      </div>

                      <h4
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          color: 'var(--ink, #1b1f3b)',
                          margin: '0 0 4px',
                          lineHeight: 1.3
                        }}
                      >
                        {sName}
                      </h4>
                      <div style={{ fontSize: '0.78rem', color: 'var(--mute, #454b66)', fontWeight: 600 }}>
                        {schemeObj.category}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveScheme(schemeObj.scheme_id)}
                      style={{
                        marginTop: '12px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: '#fff0f0',
                        border: '1.5px solid #ff4d4f',
                        color: '#d9363e',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <X size={14} />
                      {language === 'hi' ? 'हटाएं' : 'Remove from comparison'}
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={`empty-slot-${slotIndex}`}
                  style={{
                    border: '2px dashed color-mix(in srgb, var(--ink, #1b1f3b) 30%, transparent)',
                    borderRadius: '12px',
                    padding: '20px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '130px',
                    color: 'var(--mute, #454b66)',
                    background: 'rgba(0, 0, 0, 0.01)'
                  }}
                >
                  <Plus size={22} color="var(--mute, #454b66)" />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {slotIndex === 0
                      ? 'Select Scheme 1'
                      : slotIndex === 1
                      ? 'Select Scheme 2'
                      : 'Optional Scheme 3'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Primary Action Button: Compare Schemes */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              paddingTop: '16px',
              borderTop: '1.5px dashed color-mix(in srgb, var(--ink, #1b1f3b) 20%, transparent)'
            }}
          >
            <div style={{ fontSize: '0.88rem', color: 'var(--mute, #454b66)' }}>
              {selectedIds.length < 2
                ? (language === 'hi' ? 'तुलना शुरू करने के लिए कम से कम 2 योजनाएं चुनें।' : 'Select at least 2 schemes to enable comparison.')
                : (language === 'hi' ? 'योजनाएं तैयार हैं! नीचे तुलना उत्पन्न करने के लिए क्लिक करें।' : 'Schemes selected! Click below to view side-by-side details.')}
            </div>

            <button
              type="button"
              disabled={selectedIds.length < 2 || isComparing}
              onClick={handleCompareClick}
              style={{
                height: '48px',
                padding: '0 28px',
                borderRadius: '12px',
                background: selectedIds.length >= 2 ? 'var(--leaf, #2fbf85)' : '#d0d4e4',
                color: selectedIds.length >= 2 ? '#1b1f3b' : '#707793',
                border: '2px solid var(--ink, #1b1f3b)',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: selectedIds.length >= 2 ? 'pointer' : 'not-allowed',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: selectedIds.length >= 2 ? '3px 3px 0 var(--ink, #1b1f3b)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeftRight size={18} />
              {isComparing
                ? (language === 'hi' ? 'तुलना उत्पन्न हो रही है...' : 'Generating Comparison...')
                : (language === 'hi' ? 'योजनाओं की तुलना करें' : 'Compare Schemes')}
            </button>
          </div>

          {/* Scheme Browser Selector / Search Area */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '2px solid var(--ink, #1b1f3b)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--ink, #1b1f3b)' }}>
                {language === 'hi' ? 'उपलब्ध सरकारी योजनाएं खोजें और जोड़ें:' : 'Browse & Add Schemes from Registry:'}
              </div>

              {/* Quick Search Input */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--cream, #fff6e5)',
                  border: '1.5px solid var(--ink, #1b1f3b)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  width: '280px'
                }}
              >
                <Search size={16} color="var(--ink, #1b1f3b)" />
                <input
                  type="text"
                  placeholder={language === 'hi' ? 'योजना नाम खोजें...' : 'Filter schemes...'}
                  value={selectorSearch}
                  onChange={e => setSelectorSearch(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    color: 'var(--ink, #1b1f3b)',
                    width: '100%'
                  }}
                />
                {selectorSearch && (
                  <button
                    type="button"
                    onClick={() => setSelectorSearch('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={14} color="var(--mute, #454b66)" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Chips for Selector */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                marginBottom: '14px'
              }}
            >
              <button
                type="button"
                onClick={() => setSelectorCategory('all')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: selectorCategory === 'all' ? 800 : 600,
                  border: '1.5px solid var(--ink, #1b1f3b)',
                  background: selectorCategory === 'all' ? 'var(--saf, #ff8a1f)' : 'var(--cream, #fff6e5)',
                  color: '#1b1f3b',
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectorCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    fontSize: '0.78rem',
                    fontWeight: selectorCategory === cat ? 800 : 600,
                    border: '1.5px solid var(--ink, #1b1f3b)',
                    background: selectorCategory === cat ? 'var(--saf, #ff8a1f)' : 'var(--card, #fff)',
                    color: '#1b1f3b',
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Schemes Selection Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '10px',
                maxHeight: '280px',
                overflowY: 'auto',
                padding: '4px',
                border: '1.5px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)',
                borderRadius: '12px'
              }}
            >
              {isLoadingSchemes ? (
                <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: 'var(--mute, #454b66)' }}>
                  Loading official scheme registry...
                </div>
              ) : filteredAvailableSchemes.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: 'var(--mute, #454b66)' }}>
                  No schemes match your selector search.
                </div>
              ) : (
                filteredAvailableSchemes.map(s => {
                  const isSelected = selectedIds.includes(s.scheme_id);
                  const isMaxReached = selectedIds.length >= 3 && !isSelected;
                  const sName = language === 'hi' && s.name_hi ? s.name_hi : s.name_en;

                  return (
                    <div
                      key={s.scheme_id}
                      onClick={() => {
                        if (!isMaxReached) handleToggleScheme(s.scheme_id);
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--ink, #1b1f3b)',
                        background: isSelected
                          ? 'color-mix(in srgb, var(--leaf, #2fbf85) 20%, #fff)'
                          : isMaxReached
                          ? '#f5f5f5'
                          : 'var(--card, #fff)',
                        cursor: isMaxReached ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        opacity: isMaxReached ? 0.6 : 1,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            color: 'var(--ink, #1b1f3b)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          title={sName}
                        >
                          {sName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--mute, #454b66)' }}>
                          {s.category} • {s.level.toUpperCase()}
                        </div>
                      </div>

                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: '1.5px solid var(--ink, #1b1f3b)',
                          background: isSelected ? 'var(--leaf, #2fbf85)' : '#fff',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isSelected && <Check size={16} color="#1b1f3b" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Comparison Results Section */}
      {comparisonActive && comparedSchemes.length >= 2 && (
        <section
          ref={comparisonTableRef}
          style={{ maxWidth: '1440px', margin: '0 auto', padding: '10px 20px 60px' }}
        >
          {/* Header of Results with Actions */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '16px'
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'color-mix(in srgb, var(--leaf, #2fbf85) 15%, #fff)',
                  color: '#0d652d',
                  border: '1.5px solid #0d652d',
                  fontWeight: 800,
                  fontSize: '0.78rem'
                }}
              >
                <ShieldCheck size={14} />
                COMPARING {comparedSchemes.length} OFFICIAL GOVERNMENT SCHEMES
              </span>
              <h2
                style={{
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: 'var(--ink, #1b1f3b)',
                  margin: '6px 0 0',
                  fontFamily: '"Baloo 2", Inter, sans-serif'
                }}
              >
                Side-by-Side Scheme Analysis
              </h2>
            </div>

            {/* Print and Export Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: 'var(--card, #fff)',
                  border: '2px solid var(--ink, #1b1f3b)',
                  color: 'var(--ink, #1b1f3b)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '2px 2px 0 var(--ink, #1b1f3b)'
                }}
              >
                <Printer size={15} />
                Print Comparison
              </button>
            </div>
          </div>

          {/* Intelligent Differences Callout Box */}
          {comparativeInsights && (
            <div
              style={{
                background: 'var(--card, #fff)',
                border: '2px solid var(--ink, #1b1f3b)',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '4px 4px 0 var(--ink, #1b1f3b)',
                marginBottom: '24px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#9c4400',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '10px'
                }}
              >
                <Sparkles size={16} color="var(--saf, #ff8a1f)" />
                {language === 'hi' ? 'मुख्य तुलनात्मक अंतर्दृष्टि (Key Comparative Insights)' : 'Key Comparative Insights'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {/* Insight 1: Sector / Category coverage */}
                <div
                  style={{
                    background: 'var(--cream, #fff6e5)',
                    border: '1.5px solid var(--ink, #1b1f3b)',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--mute, #454b66)', textTransform: 'uppercase' }}>
                    Sectors Represented
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink, #1b1f3b)', marginTop: '4px' }}>
                    {comparativeInsights.categories.join(' • ')}
                  </div>
                </div>

                {/* Insight 2: Document Commonalities */}
                <div
                  style={{
                    background: 'var(--cream, #fff6e5)',
                    border: '1.5px solid var(--ink, #1b1f3b)',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--mute, #454b66)', textTransform: 'uppercase' }}>
                    Common Document Verification
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink, #1b1f3b)', marginTop: '4px' }}>
                    {comparativeInsights.sharedDocs.length > 0
                      ? comparativeInsights.sharedDocs.join(', ')
                      : 'Each scheme mandates distinct specialized documents (land records, marksheets, or medical certificates).'}
                  </div>
                </div>

                {/* Insight 3: Financial Scale */}
                <div
                  style={{
                    background: 'var(--cream, #fff6e5)',
                    border: '1.5px solid var(--ink, #1b1f3b)',
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--mute, #454b66)', textTransform: 'uppercase' }}>
                    Benefit Delivery
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--ink, #1b1f3b)', marginTop: '4px' }}>
                    100% Direct Benefit Transfer (DBT) to Aadhaar-seeded accounts or cashless hospital coverage.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison Table Container */}
          <div
            style={{
              background: 'var(--card, #fff)',
              border: '2px solid var(--ink, #1b1f3b)',
              borderRadius: '18px',
              overflowX: 'auto',
              boxShadow: '6px 6px 0 var(--ink, #1b1f3b)'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                minWidth: comparedSchemes.length === 3 ? '950px' : '750px'
              }}
            >
              <thead>
                <tr style={{ background: 'var(--ink, #1b1f3b)', color: '#fff' }}>
                  <th
                    style={{
                      padding: '18px 20px',
                      width: '24%',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      borderBottom: '2px solid var(--ink, #1b1f3b)',
                      position: 'sticky',
                      left: 0,
                      background: 'var(--ink, #1b1f3b)',
                      zIndex: 2
                    }}
                  >
                    Comparison Criteria
                  </th>
                  {comparedSchemes.map(s => {
                    const sName = language === 'hi' && s.name_hi ? s.name_hi : s.name_en;
                    return (
                      <th
                        key={s.scheme_id}
                        style={{
                          padding: '18px 20px',
                          width: `${76 / comparedSchemes.length}%`,
                          fontSize: '1.05rem',
                          fontWeight: 800,
                          borderLeft: '2px solid rgba(255, 255, 255, 0.2)',
                          borderBottom: '2px solid var(--ink, #1b1f3b)',
                          verticalAlign: 'top'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: s.level === 'central' ? 'var(--leaf, #2fbf85)' : 'var(--saf, #ff8a1f)',
                              color: '#1b1f3b'
                            }}
                          >
                            {s.level.toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveScheme(s.scheme_id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#fff',
                              cursor: 'pointer',
                              padding: '2px'
                            }}
                            title="Remove from comparison"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div style={{ marginTop: '8px', lineHeight: 1.3 }}>{sName}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {/* 1. MINISTRY & JURISDICTION */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Ministry & Level
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.92rem', color: 'var(--ink, #1b1f3b)', borderLeft: '1px solid #e0e0e0' }}>
                      <div style={{ fontWeight: 700 }}>{s.ministry_or_dept || 'Not specified in available official documentation.'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--mute, #454b66)', marginTop: '4px' }}>
                        Level: {s.level.toUpperCase()} {s.state ? `(${s.state})` : '(Pan-India)'}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 2. CATEGORY */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)', background: '#fafafc' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Scheme Sector
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.92rem', color: 'var(--ink, #1b1f3b)', borderLeft: '1px solid #e0e0e0' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'var(--cream, #fff6e5)',
                          border: '1px solid var(--ink, #1b1f3b)',
                          fontWeight: 700,
                          fontSize: '0.82rem'
                        }}
                      >
                        {s.category}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 3. CORE FINANCIAL & MATERIAL BENEFITS */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Financial & Material Benefits
                  </td>
                  {comparedSchemes.map(s => {
                    const ben = language === 'hi' && s.benefits_summary_hi ? s.benefits_summary_hi : s.benefits_summary_en;
                    return (
                      <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.92rem', color: 'var(--ink, #1b1f3b)', borderLeft: '1px solid #e0e0e0' }}>
                        <div
                          style={{
                            background: 'color-mix(in srgb, var(--leaf, #2fbf85) 15%, #fff)',
                            border: '1.5px solid var(--leaf, #2fbf85)',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontWeight: 700,
                            lineHeight: 1.4
                          }}
                        >
                          {ben || 'Not specified in available official documentation.'}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* 4. ELIGIBILITY CRITERIA */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)', background: '#fafafc' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Eligibility Criteria
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.92rem', color: 'var(--ink, #1b1f3b)', lineHeight: 1.5, borderLeft: '1px solid #e0e0e0' }}>
                      {s.eligibility_criteria || 'Not specified in available official documentation.'}
                    </td>
                  ))}
                </tr>

                {/* 5. AGE REQUIREMENTS */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Age Criteria
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.92rem', color: 'var(--ink, #1b1f3b)', borderLeft: '1px solid #e0e0e0', fontWeight: 600 }}>
                      {s.age_criteria || 'Not specified in available official documentation.'}
                    </td>
                  ))}
                </tr>

                {/* 6. INCOME REQUIREMENTS */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)', background: '#fafafc' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Income Ceiling
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.92rem', color: 'var(--ink, #1b1f3b)', borderLeft: '1px solid #e0e0e0', fontWeight: 600 }}>
                      {s.income_criteria || 'Not specified in available official documentation.'}
                    </td>
                  ))}
                </tr>

                {/* 7. TARGET BENEFICIARIES */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Target Beneficiaries
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.92rem', color: 'var(--ink, #1b1f3b)', lineHeight: 1.5, borderLeft: '1px solid #e0e0e0' }}>
                      {s.beneficiaries || 'Not specified in available official documentation.'}
                    </td>
                  ))}
                </tr>

                {/* 8. REQUIRED DOCUMENTS */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)', background: '#fafafc' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Required Documents
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.88rem', color: 'var(--ink, #1b1f3b)', borderLeft: '1px solid #e0e0e0' }}>
                      {s.required_documents && s.required_documents.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {s.required_documents.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      ) : (
                        'Not specified in available official documentation.'
                      )}
                    </td>
                  ))}
                </tr>

                {/* 9. APPLICATION PROCESS & ACCESS */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Application Process & Mode
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.92rem', color: 'var(--ink, #1b1f3b)', lineHeight: 1.5, borderLeft: '1px solid #e0e0e0' }}>
                      <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                        Mode: {s.application_mode || 'Online / Offline'}
                      </div>
                      <div>{s.application_process || 'Not specified in available official documentation.'}</div>
                      {s.official_portal_url && (
                        <a
                          href={s.official_portal_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '8px',
                            color: '#1a73e8',
                            fontWeight: 700,
                            fontSize: '0.82rem'
                          }}
                        >
                          <ExternalLink size={13} />
                          {s.official_portal_url.replace('https://', '')}
                        </a>
                      )}
                    </td>
                  ))}
                </tr>

                {/* 10. STATUTORY EXCLUSIONS */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)', background: '#fffcf7' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: '#9c4400', background: '#fff5e6', position: 'sticky', left: 0 }}>
                    Statutory Exclusions
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.88rem', color: '#7a3100', lineHeight: 1.45, borderLeft: '1px solid #e0e0e0' }}>
                      {s.exclusions || 'Not specified in available official documentation.'}
                    </td>
                  ))}
                </tr>

                {/* 11. GOVERNING GUIDELINES & GAZETTE PROVENANCE */}
                <tr style={{ borderBottom: '1px solid color-mix(in srgb, var(--ink, #1b1f3b) 15%, transparent)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Governing Official Document
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '16px 20px', fontSize: '0.88rem', color: 'var(--ink, #1b1f3b)', borderLeft: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                        <BookOpen size={16} color="var(--leaf, #2fbf85)" />
                        {s.guideline_title || 'Official Operational Guidelines'}
                      </div>
                      {s.pdf_filename && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--mute, #454b66)', marginTop: '2px' }}>
                          File: {s.pdf_filename}
                        </div>
                      )}
                      {s.relevant_pages && s.relevant_pages.length > 0 && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--mute, #454b66)' }}>
                          Cited Pages: {s.relevant_pages.join(', ')}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* 12. DIRECT ACTION BUTTONS */}
                <tr style={{ background: 'var(--cream, #fff6e5)' }}>
                  <td style={{ padding: '20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)', background: 'var(--cream, #fff6e5)', position: 'sticky', left: 0 }}>
                    Actions
                  </td>
                  {comparedSchemes.map(s => (
                    <td key={s.scheme_id} style={{ padding: '20px', borderLeft: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Link
                          to={`/app/eligibility?scheme=${encodeURIComponent(s.code)}`}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: 'var(--leaf, #2fbf85)',
                            color: '#1b1f3b',
                            border: '1.5px solid var(--ink, #1b1f3b)',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            textAlign: 'center',
                            textDecoration: 'none',
                            boxShadow: '2px 2px 0 var(--ink, #1b1f3b)'
                          }}
                        >
                          Check Eligibility
                        </Link>

                        <Link
                          to={`/schemes/${s.scheme_id}`}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: 'var(--card, #fff)',
                            color: 'var(--ink, #1b1f3b)',
                            border: '1.5px solid var(--ink, #1b1f3b)',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            textAlign: 'center',
                            textDecoration: 'none'
                          }}
                        >
                          View Full Details & PDF
                        </Link>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default ComparePage;
