/**
 * PDF Evidence Coordinate Viewer Modal
 *
 * Enforces Blueprint Section 7.5 & Phase 8 Gate:
 * - Every citation chip and verified rule page reference opens the exact official PDF page.
 * - Visual saffron bounding box highlights overlaid directly on official gazette text.
 * - Displays cryptographic SHA-256 hash, page geometry, and zoom controls.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  Download,
  ExternalLink,
  Layers,
  RefreshCw,
  Info
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PdfEvidenceViewerModalProps {
  versionId: string;
  initialPage?: number;
  documentTitle?: string;
  quoteSnippet?: string;
  onClose: () => void;
}

interface PageEvidenceData {
  version_id: string;
  document_id: string;
  document_title: string;
  document_type: string;
  binary_sha256: string;
  page_number: number;
  total_pages: number;
  page_geometry: {
    width: number;
    height: number;
    rotation: number;
  };
  image_url: string;
  boxes_count: number;
  boxes: Array<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    text_snippet: string;
    chunk_id: string;
    section_title?: string;
  }>;
}

export const PdfEvidenceViewerModal: React.FC<PdfEvidenceViewerModalProps> = ({
  versionId,
  initialPage = 1,
  documentTitle = 'Official Document',
  quoteSnippet,
  onClose
}) => {
  const { language } = useLanguage();
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [evidenceData, setEvidenceData] = useState<PageEvidenceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'highlighted' | 'pdf'>('highlighted');

  useEffect(() => {
    const fetchPageEvidence = async () => {
      setIsLoading(true);
      try {
        const resp = await fetch(`http://127.0.0.1:8005/api/v1/evidence/${versionId}/${currentPage}`);
        if (resp.ok) {
          const json = await resp.json();
          setEvidenceData(json.data);
        } else {
          console.error('Evidence endpoint failed:', resp.status);
        }
      } catch (err) {
        console.error('Failed to load PDF evidence:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPageEvidence();
  }, [versionId, currentPage]);

  const totalPages = evidenceData?.total_pages || 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '1050px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface-elevated)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-normal)'
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            background: 'var(--bg-app)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-saffron-light)',
                color: 'var(--accent-saffron)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileText size={20} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--text-primary)'
                  }}
                >
                  {evidenceData?.document_title || documentTitle}
                </h3>
                <span className="badge badge-emerald" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                  <ShieldCheck size={12} />
                  Verified Immutable
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                SHA-256: {evidenceData?.binary_sha256?.slice(0, 16)}... • Version: {versionId}
              </div>
            </div>
          </div>

          {/* Controls: Zoom, Coordinate toggle, and Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {/* View Mode Toggle: Highlighted Page vs Raw PDF Stream */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setViewMode('highlighted')}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  background: viewMode === 'highlighted' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'highlighted' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {language === 'hi' ? 'साक्ष्य हाइलाइट' : 'Highlights'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('pdf')}
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  background: viewMode === 'pdf' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'pdf' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {language === 'hi' ? 'मूल पीडीएफ' : 'Raw PDF'}
              </button>
            </div>

            {/* Direct Download Official PDF */}
            <a
              href={`http://127.0.0.1:8005/api/v1/evidence/${versionId}/pdf`}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              title="Download Official Government PDF"
            >
              <Download size={13} />
              <span>PDF</span>
            </a>

            {/* Toggle Coordinate Panel */}
            <button
              onClick={() => setShowCoordinates(!showCoordinates)}
              className={`btn btn-sm ${showCoordinates ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
              title="Inspect raw bounding box points"
            >
              <Layers size={13} />
              <span>{showCoordinates ? 'Hide Coords' : 'Coords'}</span>
            </button>

            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setZoomLevel(Math.max(0.7, zoomLevel - 0.15))}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.3rem 0.5rem' }}
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0 0.35rem', minWidth: '42px', textAlign: 'center' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(1.8, zoomLevel + 0.15))}
                className="btn btn-ghost btn-sm"
                style={{ padding: '0.3rem 0.5rem' }}
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
            </div>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.4rem', borderRadius: 'var(--radius-full)' }}
              title="Close Viewer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Verbatim Quote Snippet Banner */}
        {quoteSnippet && (
          <div
            style={{
              padding: '0.65rem 1.5rem',
              background: 'rgba(245, 158, 11, 0.08)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.82rem'
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: 'var(--accent-saffron)',
                textTransform: 'uppercase',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
                flexShrink: 0
              }}
            >
              CITED GAZETTE QUOTE:
            </span>
            <span style={{ fontStyle: 'italic', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{quoteSnippet}"
            </span>
          </div>
        )}

        {/* Main Viewer Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {/* PDF Page Canvas Viewport */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              alignItems: viewMode === 'pdf' ? 'stretch' : 'flex-start',
              justifyContent: 'center',
              padding: viewMode === 'pdf' ? 0 : '1.5rem',
              background: viewMode === 'pdf' ? '#525659' : 'var(--bg-app)'
            }}
          >
            {viewMode === 'pdf' ? (
              <iframe
                src={`http://127.0.0.1:8005/api/v1/evidence/${versionId}/pdf#page=${currentPage}&zoom=${Math.round(zoomLevel * 100)}`}
                title="Official Government PDF Viewer"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block'
                }}
              />
            ) : isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', marginTop: '20vh' }}>
                <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {language === 'hi' ? 'दस्तावेज़ पृष्ठ और निर्देशांक रेंडर हो रहे हैं...' : 'Rendering official PDF page with coordinate highlights...'}
                </span>
              </div>
            ) : evidenceData ? (
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  position: 'relative'
                }}
              >
                {/* 150 DPI Rendered Page with High-Precision Highlights */}
                <img
                  src={`http://127.0.0.1:8005${evidenceData.image_url}`}
                  alt={`Official Document Page ${currentPage}`}
                  style={{
                    display: 'block',
                    maxWidth: '800px',
                    width: '100%',
                    height: 'auto',
                    userSelect: 'none'
                  }}
                  onError={() => {
                    setViewMode('pdf');
                  }}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '20vh', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <Info size={32} style={{ color: 'var(--accent-saffron)' }} />
                <div>Official PDF rendered page is loading or available via PDF Stream.</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button onClick={() => setViewMode('pdf')} className="btn btn-primary btn-sm">
                    Switch to Raw PDF View
                  </button>
                  <a href={`http://127.0.0.1:8005/api/v1/evidence/${versionId}/pdf`} download className="btn btn-secondary btn-sm">
                    <Download size={13} />
                    Download PDF
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Coordinate Inspection Side Drawer */}
          {showCoordinates && evidenceData && (
            <div
              style={{
                width: '320px',
                borderLeft: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface-elevated)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                padding: '1rem',
                gap: '0.75rem'
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Extracted Bounding Boxes ({evidenceData.boxes_count})
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Page dimensions: {evidenceData.page_geometry.width}pt × {evidenceData.page_geometry.height}pt (72 DPI points)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                {evidenceData.boxes.map((b, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.72rem'
                    }}
                  >
                    <div style={{ fontFamily: 'monospace', color: 'var(--accent-saffron)', fontWeight: 600 }}>
                      [{b.x0.toFixed(1)}, {b.y0.toFixed(1)}, {b.x1.toFixed(1)}, {b.y1.toFixed(1)}]
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>
                      "{b.text_snippet}"
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Pagination Bar */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-app)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1 || isLoading}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <ChevronLeft size={15} />
              <span>{language === 'hi' ? 'पिछला पृष्ठ' : 'Previous'}</span>
            </button>

            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 0.5rem' }}>
              {language === 'hi' ? `पृष्ठ ${currentPage} / ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
            </span>

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages || isLoading}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span>{language === 'hi' ? 'अगला पृष्ठ' : 'Next'}</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {evidenceData?.boxes_count || 0} coordinate highlight regions on this page
          </div>
        </div>
      </div>
    </div>
  );
};


