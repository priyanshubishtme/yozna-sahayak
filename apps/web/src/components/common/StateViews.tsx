/**
 * Loading, Empty, Error, and Offline State Components
 */

import React from 'react';
import { AlertTriangle, WifiOff, Inbox, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const LoadingSkeleton: React.FC<{ count?: number; height?: string }> = ({
  count = 3,
  height = '120px'
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ width: '100%', height, borderRadius: 'var(--radius-md)' }}
        />
      ))}
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({ title, description, actionLabel, onAction, icon }) => {
  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 1.5rem',
        textAlign: 'center',
        gap: '1rem',
        maxWidth: '540px',
        margin: '2rem auto'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-primary-light)',
          color: 'var(--accent-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {icon || <Inbox size={28} />}
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.35rem' }}>
          {title}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.5 }}>
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while processing your request.',
  onRetry
}) => {
  const { t } = useLanguage();

  return (
    <div
      className="glass-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        gap: '1rem',
        maxWidth: '540px',
        margin: '2rem auto',
        borderColor: 'var(--accent-danger)'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-danger-light)',
          color: 'var(--accent-danger)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <AlertTriangle size={28} />
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-danger)', marginBottom: '0.35rem' }}>
          {title}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
          {message}
        </p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary" style={{ marginTop: '0.5rem' }}>
          <RefreshCw size={16} />
          {t('btn.retry')}
        </button>
      )}
    </div>
  );
};

export const OfflineBanner: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="offline-banner">
      <WifiOff size={16} />
      <span>{t('status.offlineBanner')}</span>
    </div>
  );
};
