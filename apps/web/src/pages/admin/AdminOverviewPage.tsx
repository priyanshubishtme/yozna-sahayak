/**
 * Admin Console Overview Dashboard
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe2,
  FileCheck2,
  Scale,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Server
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const AdminOverviewPage: React.FC = () => {
  const { t } = useLanguage();
  const [sourcesCount, setSourcesCount] = useState<number>(5);
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8005/health')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setHealthData(data.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.25rem' }}>
          {t('admin.nav.overview')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          System telemetry, policy approval gates, and document intelligence pipelines.
        </p>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <span>REGISTERED SOURCES</span>
            <Globe2 size={16} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{sourcesCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-saffron)', marginTop: '0.25rem' }}>
            myScheme locked (manual only)
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <span>INITIAL SCHEMES</span>
            <FileCheck2 size={16} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-primary)' }}>13</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Central & Uttarakhand State
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <span>PENDING REVIEWS</span>
            <AlertTriangle size={16} style={{ color: 'var(--accent-saffron)' }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-saffron)' }}>0</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Review queue clear
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <span>BACKEND STATUS</span>
            <Server size={16} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: healthData?.status === 'ok' ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
            {healthData?.status ? healthData.status.toUpperCase() : 'CHECKING'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            DB: {healthData?.database_connected ? 'Connected' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Operational Modules Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe2 size={18} style={{ color: 'var(--accent-primary)' }} />
            Source Registry & Compliance
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Inspect robots.txt, Terms of Use, and authorization certificates. No crawler runs without explicit policy approval.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
            <Link to="/admin/sources" className="btn btn-secondary btn-sm">
              Manage Sources <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck2 size={18} style={{ color: 'var(--accent-saffron)' }} />
            Discovery & Review Queue
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Newly fetched resources are classified as new, changed, or duplicate based on SHA-256 fingerprints before human approval.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
            <Link to="/admin/review-queue" className="btn btn-secondary btn-sm">
              Open Review Queue <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scale size={18} style={{ color: 'var(--accent-blue)' }} />
            Eligibility Rule Governance
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
            Review extracted logic trees and verbatim evidence quotes. Changed documents flag dependent rules <code>needs_review</code>.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
            <Link to="/admin/rules" className="btn btn-secondary btn-sm">
              Review Rules <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

