/**
 * Official Scheme Detail View with Integrated Interactive PDF Viewer
 * Two-Column Responsive Layout (Information & Official Gazette)
 * Indian Civic Neo-Brutalist Design System
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Building2,
  Sparkles,
  Download,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  BookOpen,
  MapPin,
  Clock,
  Layers,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { SchemeItem, VerifiedDocumentItem, ActiveRuleItem } from '../../types';

export const PublicSchemeDetailPage: React.FC = () => {
  const { schemeId } = useParams<{ schemeId: string }>();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [scheme, setScheme] = useState<SchemeItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // PDF Viewer State
  const [selectedDocIndex, setSelectedDocIndex] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'info' | 'pdf'>('info');
  const [previewMode, setPreviewMode] = useState<'stream' | 'annotated'>('stream');

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Fetch full scheme detail
  useEffect(() => {
    if (!schemeId) return;
    setLoading(true);
    setError(null);

    fetch(`http://127.0.0.1:8005/api/v1/schemes/${encodeURIComponent(schemeId)}`)
      .then(res => {
        if (!res.ok) throw new Error(`Scheme could not be retrieved (HTTP ${res.status})`);
        return res.json();
      })
      .then(data => {
        if (data.ok && data.data) {
          setScheme(data.data);
          // Set initial page to first relevant page if available
          if (data.data.relevant_pages && data.data.relevant_pages.length > 0) {
            setCurrentPage(data.data.relevant_pages[0]);
          } else {
            setCurrentPage(1);
          }
        } else {
          throw new Error('Scheme data is missing or improperly formatted');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching scheme detail:', err);
        setError(err.message || 'Failed to load scheme details');
        setLoading(false);
      });
  }, [schemeId]);

  // Selected document
  const activeDocument: VerifiedDocumentItem | undefined =
    scheme?.verified_documents && scheme.verified_documents.length > selectedDocIndex
      ? scheme.verified_documents[selectedDocIndex]
      : undefined;

  const totalPages = activeDocument?.total_pages || 1;

  // Page Navigation Handlers
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageSelect = (p: number) => {
    setCurrentPage(Math.min(Math.max(1, p), totalPages));
  };

  // Zoom Handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(200, prev + 15));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(60, prev - 15));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!pdfContainerRef.current) return;
    if (!document.fullscreenElement) {
      pdfContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.warn(err));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(err => console.warn(err));
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (loading) {
    return (
      <div className="yl" style={{ minHeight: '100vh', padding: '60px 20px', textAlign: 'center', background: 'var(--cream, #fff6e5)' }}>
        <div
          style={{
            display: 'inline-block',
            width: '44px',
            height: '44px',
            border: '4px solid var(--cream, #fff6e5)',
            borderTop: '4px solid var(--leaf, #2fbf85)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <h2 style={{ marginTop: '20px', fontWeight: 800, color: 'var(--ink, #1b1f3b)' }}>
          {language === 'hi' ? 'योजना और राजपत्र लोड हो रहा है...' : 'Loading verified scheme & official gazette...'}
        </h2>
      </div>
    );
  }

  if (error || !scheme) {
    return (
      <div className="yl" style={{ minHeight: '100vh', padding: '60px 20px', background: 'var(--cream, #fff6e5)' }}>
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            background: 'var(--card, #fff)',
            border: '2px solid var(--ink, #1b1f3b)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '4px 4px 0 var(--ink, #1b1f3b)'
          }}
        >
          <AlertTriangle size={48} color="#d9363e" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink, #1b1f3b)', margin: '0 0 10px' }}>
            Scheme Not Found
          </h2>
          <p style={{ color: 'var(--mute, #454b66)', marginBottom: '24px' }}>
            {error || 'The requested scheme could not be found in the verified government registry.'}
          </p>
          <Link
            to="/schemes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              background: 'var(--leaf, #2fbf85)',
              border: '2px solid var(--ink, #1b1f3b)',
              fontWeight: 700,
              color: '#1b1f3b',
              textDecoration: 'none',
              boxShadow: '2px 2px 0 var(--ink, #1b1f3b)'
            }}
          >
            <ArrowLeft size={16} />
            Back to Schemes Catalogue
          </Link>
        </div>
      </div>
    );
  }

  const name = language === 'hi' && scheme.name_hi ? scheme.name_hi : scheme.name_en;
  const desc = language === 'hi' && scheme.description_hi ? scheme.description_hi : scheme.description_en;
  const benefits = language === 'hi' && scheme.benefits_summary_hi ? scheme.benefits_summary_hi : scheme.benefits_summary_en;

  // Backend streaming PDF URL with resilient fallback
  const activeVersionId = activeDocument?.version_id || scheme?.scheme_id || 'ver-pm_kisan-ae82cac8';
  const pdfStreamUrl = `http://127.0.0.1:8005/api/v1/evidence/${activeVersionId}/pdf#page=${currentPage}&zoom=${zoomLevel}`;
  const directDownloadUrl = `http://127.0.0.1:8005/api/v1/evidence/${activeVersionId}/pdf`;

  return (
    <div className="yl" style={{ minHeight: '100vh', background: 'var(--cream, #fff6e5)' }}>
      {/* Top Breadcrumb & Action Header */}
      <section style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 20px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          {/* Back Link */}
          <Link
            to="/schemes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--ink, #1b1f3b)',
              fontSize: '0.95rem',
              fontWeight: 700,
              textDecoration: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--ink, #1b1f3b)',
              background: 'var(--card, #fff)',
              boxShadow: '2px 2px 0 var(--ink, #1b1f3b)'
            }}
          >
            <ArrowLeft size={16} />
            {language === 'hi' ? 'योजना सूची पर वापस जाएं' : 'Back to Scheme Catalogue'}
          </Link>

          {/* Quick CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            {scheme.official_portal_url && (
              <a
                href={scheme.official_portal_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '2px solid var(--ink, #1b1f3b)',
                  background: 'var(--card, #fff)',
                  color: 'var(--ink, #1b1f3b)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  boxShadow: '2px 2px 0 var(--ink, #1b1f3b)'
                }}
              >
                <ExternalLink size={15} />
                {language === 'hi' ? 'आधिकारिक पोर्टल' : 'Official Portal'}
              </a>
            )}

            <Link
              to={`/app/eligibility?scheme=${encodeURIComponent(scheme.code)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '10px',
                border: '2px solid var(--ink, #1b1f3b)',
                background: 'var(--leaf, #2fbf85)',
                color: '#1b1f3b',
                fontWeight: 800,
                fontSize: '0.92rem',
                textDecoration: 'none',
                boxShadow: '3px 3px 0 var(--ink, #1b1f3b)'
              }}
            >
              <CheckCircle2 size={16} />
              {language === 'hi' ? 'मेरी पात्रता जांचें' : 'Check My Eligibility'}
            </Link>
          </div>
        </div>

        {/* Scheme Hero Card */}
        <div
          style={{
            background: 'var(--card, #fff)',
            border: '2px solid var(--ink, #1b1f3b)',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '5px 5px 0 var(--ink, #1b1f3b)',
            marginTop: '16px'
          }}
        >
          {/* Badges Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 800,
                border: '1.5px solid var(--ink, #1b1f3b)',
                background: scheme.level === 'central' ? '#e6f4ea' : '#e8f0fe',
                color: scheme.level === 'central' ? '#137333' : '#1a73e8',
                letterSpacing: '0.04em'
              }}
            >
              {scheme.level.toUpperCase()} JURISDICTION
            </span>

            <span
              style={{
                padding: '4px 12px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1.5px solid var(--ink, #1b1f3b)',
                background: 'var(--cream, #fff6e5)',
                color: 'var(--ink, #1b1f3b)'
              }}
            >
              {scheme.category}
            </span>

            {scheme.state && (
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: '1.5px solid var(--ink, #1b1f3b)',
                  background: 'color-mix(in srgb, var(--saf, #ff8a1f) 20%, #fff)',
                  color: 'var(--ink, #1b1f3b)'
                }}
              >
                State: {scheme.state}
              </span>
            )}

            <span
              style={{
                marginLeft: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'color-mix(in srgb, var(--leaf, #2fbf85) 15%, #fff)',
                color: '#0d652d',
                border: '1.5px solid #0d652d'
              }}
            >
              <ShieldCheck size={15} />
              RAG & Gazette Grounded
            </span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
              fontWeight: 800,
              color: 'var(--ink, #1b1f3b)',
              lineHeight: 1.2,
              margin: '0 0 8px',
              fontFamily: '"Baloo 2", Inter, sans-serif'
            }}
          >
            {name}
          </h1>

          {scheme.ministry_or_dept && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--mute, #454b66)',
                marginBottom: '14px'
              }}
            >
              <Building2 size={18} color="var(--ink, #1b1f3b)" />
              {scheme.ministry_or_dept}
            </div>
          )}

          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--mute, #454b66)',
              lineHeight: 1.5,
              margin: '0 0 16px',
              maxWidth: '90ch'
            }}
          >
            {desc}
          </p>

          {/* Key Benefit Banner */}
          {benefits && (
            <div
              style={{
                background: 'color-mix(in srgb, var(--leaf, #2fbf85) 16%, #fff)',
                border: '2px solid var(--leaf, #2fbf85)',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <Sparkles size={24} color="#0d652d" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#0d652d', letterSpacing: '0.04em' }}>
                  {language === 'hi' ? 'मुख्य वित्तीय व सामाजिक लाभ' : 'Core Financial & Social Benefits'}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink, #1b1f3b)', marginTop: '2px' }}>
                  {benefits}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Mobile Tab Toggle */}
      <div
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 20px 12px',
          display: 'none'
        }}
        className="mobile-tab-toggle"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--card, #fff)',
            border: '2px solid var(--ink, #1b1f3b)',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          <button
            onClick={() => setMobileTab('info')}
            style={{
              padding: '12px',
              border: 'none',
              background: mobileTab === 'info' ? 'var(--leaf, #2fbf85)' : 'transparent',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              color: '#1b1f3b'
            }}
          >
            {language === 'hi' ? 'योजना विवरण' : 'Scheme Details'}
          </button>
          <button
            onClick={() => setMobileTab('pdf')}
            style={{
              padding: '12px',
              border: 'none',
              background: mobileTab === 'pdf' ? 'var(--saf, #ff8a1f)' : 'transparent',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              color: '#1b1f3b'
            }}
          >
            {language === 'hi' ? 'मूल राजपत्र (PDF)' : 'Official Gazette (PDF)'}
          </button>
        </div>
      </div>

      {/* Main Two-Column View Container */}
      <section
        style={{
          maxWidth: '1440px',
          margin: '0 auto',
          padding: '0 20px 60px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: '24px',
          alignItems: 'start'
        }}
      >
        {/* LEFT COLUMN: Detailed Scheme Information Blocks */}
        <div
          style={{
            display: mobileTab === 'pdf' ? 'none' : 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
          className="scheme-info-column"
        >
          {/* Block 1: Objectives & Purpose */}
          <div
            style={{
              background: 'var(--card, #fff)',
              border: '2px solid var(--ink, #1b1f3b)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '4px 4px 0 var(--ink, #1b1f3b)'
            }}
          >
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--ink, #1b1f3b)',
                margin: '0 0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <BookOpen size={20} color="var(--leaf, #2fbf85)" />
              {language === 'hi' ? 'योजना के उद्देश्य और कार्यक्षेत्र' : 'Objectives and Scope'}
            </h3>
            <p style={{ fontSize: '0.95rem', color: 'var(--ink, #1b1f3b)', lineHeight: 1.6, margin: 0 }}>
              {scheme.objectives || scheme.description_en}
            </p>
          </div>

          {/* Block 2: Eligibility Criteria */}
          <div
            style={{
              background: 'var(--card, #fff)',
              border: '2px solid var(--ink, #1b1f3b)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '4px 4px 0 var(--ink, #1b1f3b)'
            }}
          >
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--ink, #1b1f3b)',
                margin: '0 0 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={20} color="var(--leaf, #2fbf85)" />
              {language === 'hi' ? 'पात्रता मानदंड (Eligibility Criteria)' : 'Eligibility Criteria'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scheme.eligibility_criteria && (
                <div style={{ background: 'var(--cream, #fff6e5)', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--ink, #1b1f3b)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--mute, #454b66)', textTransform: 'uppercase' }}>
                    Core Requirement
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink, #1b1f3b)', marginTop: '2px' }}>
                    {scheme.eligibility_criteria}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--cream, #fff6e5)', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--ink, #1b1f3b)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--mute, #454b66)', textTransform: 'uppercase' }}>
                    Age Criteria
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--ink, #1b1f3b)', marginTop: '2px' }}>
                    {scheme.age_criteria || 'Specified in guidelines'}
                  </div>
                </div>

                <div style={{ background: 'var(--cream, #fff6e5)', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--ink, #1b1f3b)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--mute, #454b66)', textTransform: 'uppercase' }}>
                    Income Limit
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--ink, #1b1f3b)', marginTop: '2px' }}>
                    {scheme.income_criteria || 'As per scheme rules'}
                  </div>
                </div>
              </div>

              {scheme.beneficiaries && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--mute, #454b66)', marginBottom: '4px' }}>
                    Target Beneficiaries:
                  </div>
                  <p style={{ fontSize: '0.92rem', color: 'var(--ink, #1b1f3b)', lineHeight: 1.5, margin: 0 }}>
                    {scheme.beneficiaries}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Block 3: Required Documents Checklist */}
          {scheme.required_documents && scheme.required_documents.length > 0 && (
            <div
              style={{
                background: 'var(--card, #fff)',
                border: '2px solid var(--ink, #1b1f3b)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '4px 4px 0 var(--ink, #1b1f3b)'
              }}
            >
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--ink, #1b1f3b)',
                  margin: '0 0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FileCheck size={20} color="var(--sky, #7aa2ff)" />
                {language === 'hi' ? 'आवश्यक दस्तावेज (Required Documents)' : 'Required Documents Checklist'}
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {scheme.required_documents.map((doc, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      color: 'var(--ink, #1b1f3b)',
                      padding: '8px 12px',
                      background: 'var(--cream, #fff6e5)',
                      borderRadius: '8px',
                      border: '1px solid var(--ink, #1b1f3b)'
                    }}
                  >
                    <CheckCircle2 size={16} color="var(--leaf, #2fbf85)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Block 4: Application Process & How to Apply */}
          <div
            style={{
              background: 'var(--card, #fff)',
              border: '2px solid var(--ink, #1b1f3b)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '4px 4px 0 var(--ink, #1b1f3b)'
            }}
          >
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--ink, #1b1f3b)',
                margin: '0 0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Building2 size={20} color="var(--saf, #ff8a1f)" />
              {language === 'hi' ? 'आवेदन प्रक्रिया (Application Process)' : 'Application Process'}
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'var(--cream, #fff6e5)',
                  border: '1px solid var(--ink, #1b1f3b)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  color: 'var(--ink, #1b1f3b)'
                }}
              >
                Mode: {scheme.application_mode || 'Online / Offline CSC'}
              </span>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--ink, #1b1f3b)', lineHeight: 1.6, margin: '0 0 16px' }}>
              {scheme.application_process || 'Applications can be submitted through the designated official government portal or registered Common Service Centres.'}
            </p>

            {scheme.official_portal_url && (
              <a
                href={scheme.official_portal_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '2px solid var(--ink, #1b1f3b)',
                  background: 'var(--leaf, #2fbf85)',
                  color: '#1b1f3b',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  boxShadow: '2px 2px 0 var(--ink, #1b1f3b)'
                }}
              >
                <ExternalLink size={16} />
                Visit Official Portal ({scheme.official_portal_url.replace('https://', '')})
              </a>
            )}
          </div>

          {/* Block 5: Disqualifications & Exclusions */}
          {scheme.exclusions && (
            <div
              style={{
                background: '#fff9f0',
                border: '2px solid var(--saf, #ff8a1f)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '4px 4px 0 var(--ink, #1b1f3b)'
              }}
            >
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#9c4400',
                  margin: '0 0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={20} color="#ff8a1f" />
                {language === 'hi' ? 'महत्वपूर्ण अपवाद व शर्तें (Exclusions)' : 'Statutory Exclusions & Disqualifications'}
              </h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink, #1b1f3b)', lineHeight: 1.6, margin: 0 }}>
                {scheme.exclusions}
              </p>
            </div>
          )}

          {/* Block 6: Active Verified Rules Provenance */}
          {scheme.active_rules && scheme.active_rules.length > 0 && (
            <div
              style={{
                background: 'var(--card, #fff)',
                border: '2px solid var(--ink, #1b1f3b)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '4px 4px 0 var(--ink, #1b1f3b)'
              }}
            >
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--ink, #1b1f3b)',
                  margin: '0 0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ShieldCheck size={20} color="var(--leaf, #2fbf85)" />
                {language === 'hi' ? 'सत्यापित नियम व उद्धरण (Rule Provenance)' : 'Verified Rule Quotes & Citations'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {scheme.active_rules.map(rule => (
                  <div
                    key={rule.id}
                    style={{
                      background: 'var(--cream, #fff6e5)',
                      border: '1.5px solid var(--ink, #1b1f3b)',
                      borderRadius: '10px',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--ink, #1b1f3b)' }}>
                        {rule.rule_code}
                      </span>
                      <button
                        onClick={() => {
                          handlePageSelect(rule.page_reference);
                          setMobileTab('pdf');
                        }}
                        style={{
                          background: 'var(--leaf, #2fbf85)',
                          border: '1px solid var(--ink, #1b1f3b)',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Jump to this page in PDF"
                      >
                        Jump to Gazette Page {rule.page_reference}
                      </button>
                    </div>
                    <blockquote
                      style={{
                        margin: 0,
                        fontSize: '0.88rem',
                        fontStyle: 'italic',
                        color: 'var(--mute, #454b66)',
                        borderLeft: '3px solid var(--leaf, #2fbf85)',
                        paddingLeft: '10px'
                      }}
                    >
                      "{rule.evidence_quote}"
                    </blockquote>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Official Interactive PDF Viewer */}
        <div
          ref={pdfContainerRef}
          style={{
            display: mobileTab === 'info' ? 'none' : 'flex',
            flexDirection: 'column',
            background: 'var(--card, #fff)',
            border: '2px solid var(--ink, #1b1f3b)',
            borderRadius: '18px',
            boxShadow: '5px 5px 0 var(--ink, #1b1f3b)',
            overflow: 'hidden',
            position: 'sticky',
            top: '20px',
            height: isFullscreen ? '100vh' : 'calc(100vh - 120px)',
            minHeight: '680px'
          }}
          className="scheme-pdf-column"
        >
          {/* PDF Viewer Header & Toolbar */}
          <div
            style={{
              padding: '12px 16px',
              background: 'var(--ink, #1b1f3b)',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Top Toolbar Row: Title & Document Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <BookOpen size={18} color="var(--leaf, #2fbf85)" style={{ flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={activeDocument?.title || scheme.guideline_title || 'Official Government Gazette'}
                >
                  {activeDocument?.title || scheme.guideline_title || 'Official Government Gazette'}
                </span>
              </div>

              {/* Source Document Selector if multiple documents exist */}
              {scheme.verified_documents && scheme.verified_documents.length > 1 && (
                <select
                  value={selectedDocIndex}
                  onChange={e => {
                    const idx = Number(e.target.value);
                    setSelectedDocIndex(idx);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid #fff',
                    background: '#2c3154',
                    color: '#fff',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {scheme.verified_documents.map((doc, idx) => (
                    <option key={doc.document_id} value={idx}>
                      Doc {idx + 1}: {doc.title.slice(0, 30)}...
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Bottom Toolbar Row: Controls, Page Nav & Zoom */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                fontSize: '0.85rem'
              }}
            >
              {/* Page Navigator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  style={{
                    background: currentPage <= 1 ? '#3a4060' : 'var(--leaf, #2fbf85)',
                    color: currentPage <= 1 ? '#888' : '#1b1f3b',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  style={{
                    background: currentPage >= totalPages ? '#3a4060' : 'var(--leaf, #2fbf85)',
                    color: currentPage >= totalPages ? '#888' : '#1b1f3b',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Zoom Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={handleZoomOut}
                  style={{
                    background: '#2c3154',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    cursor: 'pointer'
                  }}
                  title="Zoom Out"
                >
                  <ZoomOut size={15} />
                </button>

                <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '40px', textAlign: 'center' }}>
                  {zoomLevel}%
                </span>

                <button
                  onClick={handleZoomIn}
                  style={{
                    background: '#2c3154',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    cursor: 'pointer'
                  }}
                  title="Zoom In"
                >
                  <ZoomIn size={15} />
                </button>

                <button
                  onClick={handleResetZoom}
                  style={{
                    background: '#2c3154',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    cursor: 'pointer'
                  }}
                  title="Reset Zoom"
                >
                  <RotateCcw size={15} />
                </button>
              </div>

              {/* View Mode Toggle: PDF Stream vs Rendered Page */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#2c3154', borderRadius: '6px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setPreviewMode('stream')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    background: previewMode === 'stream' ? 'var(--leaf, #2fbf85)' : 'transparent',
                    color: previewMode === 'stream' ? '#1b1f3b' : '#fff',
                    cursor: 'pointer'
                  }}
                  title="Official PDF Stream with zoom and scroll"
                >
                  PDF Stream
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('annotated')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    background: previewMode === 'annotated' ? 'var(--leaf, #2fbf85)' : 'transparent',
                    color: previewMode === 'annotated' ? '#1b1f3b' : '#fff',
                    cursor: 'pointer'
                  }}
                  title="High-resolution page render with highlighted coordinates"
                >
                  Highlighted
                </button>
              </div>

              {/* Download, New Tab, Fullscreen Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {directDownloadUrl && (
                  <a
                    href={directDownloadUrl}
                    download
                    style={{
                      background: 'var(--saf, #ff8a1f)',
                      color: '#1b1f3b',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none'
                    }}
                    title="Download original government PDF file"
                  >
                    <Download size={14} />
                    <span style={{ fontSize: '0.78rem' }}>Download</span>
                  </a>
                )}

                {directDownloadUrl && (
                  <a
                    href={directDownloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: '#2c3154',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none'
                    }}
                    title="Open PDF in new browser tab"
                  >
                    <ExternalLink size={14} />
                    <span style={{ fontSize: '0.78rem' }}>New Tab</span>
                  </a>
                )}

                <button
                  onClick={toggleFullscreen}
                  style={{
                    background: '#2c3154',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 6px',
                    cursor: 'pointer'
                  }}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              </div>
            </div>

            {/* Relevant Gazette Pages Quick Jump Bar */}
            {scheme.relevant_pages && scheme.relevant_pages.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingTop: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#aaa', whiteSpace: 'nowrap' }}>
                  Cited Sections:
                </span>
                {scheme.relevant_pages.map(p => (
                  <button
                    key={p}
                    onClick={() => handlePageSelect(p)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: currentPage === p ? 800 : 600,
                      border: '1px solid #fff',
                      background: currentPage === p ? 'var(--leaf, #2fbf85)' : '#2c3154',
                      color: currentPage === p ? '#1b1f3b' : '#fff',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Page {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main PDF Rendering Area */}
          <div
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              background: '#525659',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {previewMode === 'stream' ? (
              <iframe
                src={pdfStreamUrl}
                title="Official Government Gazette PDF Viewer"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block'
                }}
              />
            ) : (
              <div
                style={{
                  height: '100%',
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  padding: '20px',
                  background: '#374151'
                }}
              >
                <img
                  src={`http://127.0.0.1:8005/api/v1/evidence/${activeVersionId}/${currentPage}/image`}
                  alt={`Official Document Page ${currentPage}`}
                  style={{
                    maxWidth: '850px',
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    borderRadius: '4px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }}
                  onError={() => setPreviewMode('stream')}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Global CSS for desktop/mobile responsive split */}
      <style>{`
        @media (max-width: 960px) {
          .mobile-tab-toggle {
            display: block !important;
          }
          .scheme-info-column {
            display: ${mobileTab === 'info' ? 'flex' : 'none'} !important;
          }
          .scheme-pdf-column {
            display: ${mobileTab === 'pdf' ? 'flex' : 'none'} !important;
            position: static !important;
            height: 75vh !important;
          }
        }
        @media (min-width: 961px) {
          .scheme-info-column {
            display: flex !important;
          }
          .scheme-pdf-column {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicSchemeDetailPage;
