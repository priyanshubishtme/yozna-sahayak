/**
 * Citizen Application Layout Shell with Responsive Sidebar & Bottom Bar
 */

import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Search,
  CheckCircle2,
  Bookmark,
  User,
  Settings,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { OfflineBanner } from './StateViews';

export const CitizenLayout: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const isOnline = useNetworkStatus();

  const navItems = [
    { path: '/app', label: t('app.nav.overview'), icon: LayoutDashboard, exact: true },
    { path: '/app/chat', label: t('app.nav.chat'), icon: MessageSquare },
    { path: '/app/discover', label: t('app.nav.discover'), icon: Search },
    { path: '/app/eligibility', label: t('app.nav.eligibility'), icon: CheckCircle2 },
    { path: '/app/recommendations', label: t('app.nav.recommendations'), icon: Sparkles },
    { path: '/app/saved', label: t('app.nav.saved'), icon: Bookmark },
    { path: '/app/profile', label: t('app.nav.profile'), icon: User },
    { path: '/app/settings', label: t('app.nav.settings'), icon: Settings }
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 68px)' }}>
      {!isOnline && <OfflineBanner />}

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Desktop Citizen Sidebar */}
        <aside
          className="desktop-sidebar glass-panel"
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
              padding: '0 0.75rem 1rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)'
            }}
          >
            {t('nav.app')}
          </div>

          {navItems.map((item) => {
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
                  background: active ? 'linear-gradient(135deg, var(--accent-primary), #059669)' : 'transparent',
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
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {t('dashboard.completeness')}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {localStorage.getItem('yojana_citizen_profile') ? `${JSON.parse(localStorage.getItem('yojana_citizen_profile') || '{}').profile_completeness_pct || 85}%` : '85%'}
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${localStorage.getItem('yojana_citizen_profile') ? JSON.parse(localStorage.getItem('yojana_citizen_profile') || '{}').profile_completeness_pct || 85 : 85}%`,
                  background: 'linear-gradient(90deg, var(--accent-primary), #059669)',
                  borderRadius: '2px'
                }}
              />
            </div>
            <Link
              to="/app/profile"
              style={{
                fontSize: '0.72rem',
                color: 'var(--accent-primary)',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '4px'
              }}
            >
              <span>{t('profile.title').split(' ')[0]} {t('btn.next')}</span>
              <ArrowRight size={11} />
            </Link>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '1.5rem', maxWidth: '100%', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="mobile-bottom-bar glass-panel"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '62px',
          zIndex: 50,
          borderRadius: 0,
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 0.5rem',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      >
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontSize: '0.7rem',
                fontWeight: active ? 600 : 500,
                padding: '4px 8px'
              }}
            >
              <Icon size={18} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '56px' }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar {
            display: flex !important;
          }
          .mobile-bottom-bar {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-bottom-bar {
            display: flex !important;
          }
          main {
            padding-bottom: 80px !important;
          }
        }
      `}</style>
    </div>
  );
};
