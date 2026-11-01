/**
 * Protected Admin Console Layout Shell
 */

import React, { useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  ShieldAlert,
  Globe2,
  Cpu,
  FileCheck,
  FileText,
  Scale,
  History,
  Activity,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const AdminLayout: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    // Health probe to backend API
    fetch('http://127.0.0.1:8005/health')
      .then(res => res.json())
      .then(data => setApiHealthy(data?.ok && data?.data?.status === 'ok'))
      .catch(() => setApiHealthy(false));
  }, []);

  const adminNavItems = [
    { path: '/admin', label: t('admin.nav.overview'), icon: Activity, exact: true },
    { path: '/admin/sources', label: t('admin.nav.sources'), icon: Globe2 },
    { path: '/admin/discovery', label: t('admin.nav.discovery'), icon: Cpu },
    { path: '/admin/review-queue', label: t('admin.nav.reviewQueue'), icon: FileCheck },
    { path: '/admin/documents', label: t('admin.nav.documents'), icon: FileText },
    { path: '/admin/rules', label: t('admin.nav.rules'), icon: Scale },
    { path: '/admin/audit', label: t('admin.nav.audit'), icon: History },
    { path: '/admin/freshness', label: t('admin.nav.freshness'), icon: BarChart3 }
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 68px)' }}>
      {/* Admin Top Status Bar */}
      <div
        style={{
          background: 'var(--bg-surface-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0.4rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--accent-saffron)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldAlert size={14} />
            ADMIN SECURITY GATEWAY
          </span>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Single Scheduler Process Mode: Dedicated
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: apiHealthy === true ? 'var(--accent-primary)' : apiHealthy === false ? 'var(--accent-danger)' : 'var(--accent-saffron)'
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              Backend API: {apiHealthy === true ? 'Live & Connected' : apiHealthy === false ? 'Disconnected' : 'Checking...'}
            </span>
          </div>
          <Link
            to="/app"
            style={{
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontWeight: 500
            }}
          >
            <ArrowLeft size={14} />
            Citizen Portal
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Admin Sidebar */}
        <aside
          className="admin-sidebar glass-panel"
          style={{
            width: '260px',
            borderTop: 'none',
            borderBottom: 'none',
            borderLeft: 'none',
            borderRadius: 0,
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}
        >
          <div
            style={{
              padding: '0 0.75rem 0.75rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)'
            }}
          >
            Governance & Pipelines
          </div>

          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#ffffff' : 'var(--text-secondary)',
                  background: active ? 'linear-gradient(135deg, var(--accent-saffron), #d97706)' : 'transparent',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div
            style={{
              marginTop: 'auto',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              lineHeight: 1.4
            }}
          >
            <strong>Compliance Policy:</strong> myScheme crawler remains locked in manual/disabled mode per Section 3.3.
          </div>
        </aside>

        {/* Admin Content Area */}
        <main style={{ flex: 1, padding: '1.75rem', maxWidth: '100%', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid var(--border-subtle) !important;
          }
        }
      `}</style>
    </div>
  );
};

