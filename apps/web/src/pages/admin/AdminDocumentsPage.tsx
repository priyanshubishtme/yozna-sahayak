/**
 * Admin Document Versions, Coordinate Extraction & Ingestion View
 * Full point-coordinate inspection, page-bounded chunking, and diagnostic verification.
 */

import React, { useEffect, useState } from 'react';
import { 
  FileText, ShieldCheck, CheckCircle2, AlertTriangle, Layers, 
  Upload, RefreshCw, Eye, Sparkles, Image as ImageIcon, ExternalLink, XCircle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { LoadingSkeleton, EmptyState } from '../../components/common/StateViews';

interface DocumentItem {
  document_id: string;
  title: string;
  document_type: string;
  scheme_id?: string;
  version_id: string;
  version_number: number;
  binary_sha256: string;
  status: string;
  page_count: number;
  chunk_count: number;
  content_type: string;
  storage_key: string;
  ingested_at?: string;
  created_at?: string;
}

interface PageItem {
  id: string;
  page_number: number;
  width: number;
  height: number;
  rotation: number;
  word_count: number;
  ocr_used: boolean;
}

interface ChunkBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  text_snippet: string;
}

interface ChunkItem {
  chunk_id: string;
  page_number: number;
  chunk_index: number;
  section_title?: string;
  text: string;
  token_count: number;
  boxes: ChunkBox[];
}

export const AdminDocumentsPage: React.FC = () => {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Inspector modal state
  const [inspectVersion, setInspectVersion] = useState<DocumentItem | null>(null);
  const [inspectPages, setInspectPages] = useState<PageItem[]>([]);
  const [inspectChunks, setInspectChunks] = useState<ChunkItem[]>([]);
  const [inspectorTab, setInspectorTab] = useState<'chunks' | 'pages' | 'diagnostic'>('chunks');
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadSchemeId, setUploadSchemeId] = useState<string>('SCHEME-PM-KISAN');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadType, setUploadType] = useState<string>('guideline');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fetchDocuments = () => {
    setLoading(true);
    fetch('http://127.0.0.1:8005/api/v1/admin/documents')
      .then(res => res.json())
      .then(data => {
        if (data.ok && Array.isArray(data.data)) {
          setDocuments(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        setStatusMsg({ type: 'error', text: `Failed to load documents: ${err.message}` });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleIngest = async (versionId: string) => {
    setActionLoading(`ingest-${versionId}`);
    setStatusMsg(null);
    try {
      const res = await fetch(`http://127.0.0.1:8005/api/v1/admin/documents/${versionId}/ingest`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMsg({
          type: 'success',
          text: `Ingestion complete! Extracted ${data.data.page_count} pages, ${data.data.chunk_count} chunks, and ${data.data.box_count} coordinate boxes.`
        });
        fetchDocuments();
      } else {
        setStatusMsg({
          type: 'error',
          text: `Ingestion failed: ${data.error?.message || 'Extraction error'}`
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Network error during ingestion: ${err.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenInspector = async (doc: DocumentItem) => {
    setInspectVersion(doc);
    setInspectorTab('chunks');
    setSelectedPageNum(1);
    setModalLoading(true);

    try {
      const [pagesRes, chunksRes] = await Promise.all([
        fetch(`http://127.0.0.1:8005/api/v1/admin/documents/${doc.version_id}/pages`),
        fetch(`http://127.0.0.1:8005/api/v1/admin/documents/${doc.version_id}/chunks`)
      ]);
      const pagesData = await pagesRes.json();
      const chunksData = await chunksRes.json();

      if (pagesData.ok && Array.isArray(pagesData.data)) {
        setInspectPages(pagesData.data);
      }
      if (chunksData.ok && Array.isArray(chunksData.data)) {
        setInspectChunks(chunksData.data);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Error loading inspection data: ${err.message}` });
    } finally {
      setModalLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a PDF file to upload.');
      return;
    }

    setActionLoading('uploading');
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('scheme_id', uploadSchemeId);
    formData.append('document_title', uploadTitle || uploadFile.name);
    formData.append('document_type', uploadType);
    formData.append('file', uploadFile);

    try {
      const res = await fetch('http://127.0.0.1:8005/api/v1/admin/documents/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMsg({
          type: 'success',
          text: `Manual PDF uploaded and ingested via shared pipeline! Extracted ${data.data.ingestion.chunk_count} chunks.`
        });
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTitle('');
        fetchDocuments();
      } else {
        setStatusMsg({
          type: 'error',
          text: `Upload failed: ${data.error?.message || 'Processing error'}`
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Network error during upload: ${err.message}` });
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
            {t('admin.nav.documents')}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Point-accurate coordinate extraction, page-bounded chunks, and diagnostic spot-checks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchDocuments} title="Refresh Documents">
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
            <Upload size={16} />
            Manual PDF Upload
          </button>
        </div>
      </div>

      {/* Live Status Toast */}
      {statusMsg && (
        <div
          className="glass-card"
          style={{
            borderLeft: `4px solid ${statusMsg.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-danger)'}`,
            background: statusMsg.type === 'success' ? 'var(--accent-emerald-light)' : 'rgba(239, 68, 68, 0.1)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 size={20} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
          ) : (
            <XCircle size={20} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
          )}
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>
            {statusMsg.text}
          </span>
        </div>
      )}

      {/* Coordinate & Chunking Mandate Banner */}
      <div
        className="glass-card"
        style={{
          borderLeft: '4px solid var(--accent-primary)',
          background: 'var(--accent-primary-light)',
          padding: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <Layers size={22} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            <strong>Blueprint Section 7 Extraction Mandate:</strong>
            <ul style={{ margin: '0.35rem 0 0 1.2rem', padding: 0 }}>
              <li><strong>Single Shared Ingestion:</strong> Both scraper-discovered and manually uploaded PDFs enter the identical extraction and chunking pipeline.</li>
              <li><strong>Page-Bounded Chunks:</strong> Text chunks are strictly bounded by page and never merge across page boundaries.</li>
              <li><strong>Point Coordinates:</strong> Every line is stored with bounding box <code>[x0, y0, x1, y1]</code> in PDF points, enabling exact visual highlight overlays.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      {loading ? (
        <LoadingSkeleton count={3} height="120px" />
      ) : documents.length === 0 ? (
        <EmptyState
          title="No Registered Documents"
          description="Approve candidates from the Review Queue or upload a government circular to begin ingestion."
        />
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Title & Version</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Target Scheme</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Pages</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Chunks</th>
                  <th style={{ padding: '0.75rem 1rem' }}>SHA-256 Hash</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(d => {
                  const isIngested = d.status === 'ingested';

                  return (
                    <tr key={d.version_id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Version v{d.version_number} • ID: <code>{d.version_id}</code>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {d.scheme_id || 'Unassigned'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize' }}>
                        <span className="badge badge-muted">{d.document_type}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`badge ${isIngested ? 'badge-emerald' : 'badge-saffron'}`}>
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{d.page_count} pg</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        {d.chunk_count > 0 ? (
                          <span style={{ color: 'var(--accent-emerald)' }}>{d.chunk_count} chunks</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {d.binary_sha256.slice(0, 16)}...
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenInspector(d)}
                            title="Inspect page dimensions, chunks, and bounding boxes"
                            id={`btn-inspect-doc-${d.version_id}`}
                          >
                            <Eye size={14} />
                            Inspect
                          </button>

                          <button
                            className={`btn btn-sm ${isIngested ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleIngest(d.version_id)}
                            disabled={actionLoading !== null}
                            id={`btn-ingest-doc-${d.version_id}`}
                          >
                            <Sparkles size={14} />
                            {actionLoading === `ingest-${d.version_id}` ? 'Ingesting...' : isIngested ? 'Re-Ingest' : 'Ingest'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspector Modal */}
      {inspectVersion && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1.5rem'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--bg-surface)',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                  Coordinate & Chunk Inspector
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {inspectVersion.title} (Version v{inspectVersion.version_number})
                </div>
              </div>
              <button
                onClick={() => setInspectVersion(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.25rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Inspector Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
              <button
                className={`btn btn-sm ${inspectorTab === 'chunks' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setInspectorTab('chunks')}
              >
                Page-Bounded Chunks ({inspectChunks.length})
              </button>
              <button
                className={`btn btn-sm ${inspectorTab === 'pages' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setInspectorTab('pages')}
              >
                Extracted Pages ({inspectPages.length})
              </button>
              <button
                className={`btn btn-sm ${inspectorTab === 'diagnostic' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setInspectorTab('diagnostic')}
              >
                <ImageIcon size={14} />
                Diagnostic Coordinate Spot-Check
              </button>
            </div>

            {/* Tab 1: Chunks with Bounding Boxes */}
            {inspectorTab === 'chunks' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {inspectChunks.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No chunks extracted yet. Click 'Ingest' to extract chunks and coordinates.
                  </div>
                ) : (
                  inspectChunks.map(chk => (
                    <div
                      key={chk.chunk_id}
                      style={{
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-emerald">Page {chk.page_number}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
                            {chk.chunk_id}
                          </span>
                          {chk.section_title && (
                            <span className="badge badge-muted">{chk.section_title}</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ~{chk.token_count} tokens • {chk.boxes.length} bounding boxes
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {chk.text}
                      </div>

                      {/* Bounding Boxes List */}
                      {chk.boxes.length > 0 && (
                        <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            Point Coordinates [x0, y0, x1, y1] (PDF Points):
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                            {chk.boxes.map((box, bIdx) => (
                              <span
                                key={bIdx}
                                style={{
                                  background: 'var(--bg-surface-elevated)',
                                  padding: '0.2rem 0.45rem',
                                  borderRadius: '3px',
                                  fontSize: '0.7rem',
                                  fontFamily: 'monospace',
                                  color: 'var(--accent-primary)',
                                  border: '1px solid var(--border-subtle)'
                                }}
                                title={box.text_snippet}
                              >
                                [{box.x0}, {box.y0}, {box.x1}, {box.y1}]
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Pages Geometry */}
            {inspectorTab === 'pages' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                {inspectPages.map(p => (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-primary)' }}>
                      Page {p.page_number}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      Dimensions: <strong>{p.width} × {p.height} pt</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Rotation: {p.rotation}°
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Words: {p.word_count}
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span className={`badge ${p.ocr_used ? 'badge-saffron' : 'badge-emerald'}`}>
                        {p.ocr_used ? 'OCR Fallback' : 'Digital Text Layer'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Diagnostic Spot-Check Image */}
            {inspectorTab === 'diagnostic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Visual verification of point coordinates: rendered high-res page with saffron highlight rectangles overlaying stored line bounding boxes.
                </div>

                <div
                  style={{
                    border: '2px solid var(--border-subtle)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    maxWidth: '650px',
                    width: '100%',
                    background: '#fff',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                  }}
                >
                  <img
                    src={`http://127.0.0.1:8005/api/v1/admin/documents/${inspectVersion.version_id}/pages/${selectedPageNum}/debug-image`}
                    alt="Diagnostic Coordinate Spot-Check"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setInspectVersion(null)}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Upload Modal */}
      {showUploadModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '540px',
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
                Upload & Ingest Government PDF
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Uploaded files enter the exact single coordinate ingestion pipeline (Blueprint Section 7.1).
            </p>

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Target Scheme
                </label>
                <select
                  value={uploadSchemeId}
                  onChange={e => setUploadSchemeId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                  id="select-upload-scheme"
                  required
                >
                  <option value="SCHEME-PM-KISAN">PM-KISAN (Central)</option>
                  <option value="SCHEME-PMFBY">PM Fasal Bima Yojana</option>
                  <option value="SCHEME-UK-OLD-AGE">Uttarakhand Old Age Pension</option>
                  <option value="SCHEME-CSSS">Central Sector Scholarship</option>
                  <option value="SCHEME-UK-NANDA-GAURA">Nanda Gaura Yojana</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Document Official Title
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="e.g. Official Gazette Circular Notification 2026"
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

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Document Type
                </label>
                <select
                  value={uploadType}
                  onChange={e => setUploadType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                >
                  <option value="guideline">Operational Guideline</option>
                  <option value="circular">Ministry Circular</option>
                  <option value="notification">Gazette Notification</option>
                  <option value="faq">Official FAQ</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  PDF Document File (.pdf)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: '6px'
                  }}
                  required
                  id="input-upload-file"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading !== null}
                  id="btn-confirm-upload"
                >
                  {actionLoading === 'uploading' ? 'Ingesting...' : 'Upload & Process Ingestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

