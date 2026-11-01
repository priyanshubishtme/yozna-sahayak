/**
 * Admin Security Gateway Challenge Component
 *
 * Intercepts unauthorized visits to /admin routes and presents
 * a high-security civic access authentication portal.
 */

import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldAlert,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AdminGate: React.FC = () => {
  const { loginWithMasterKey, loginWithCredentials } = useAdminAuth();

  const [authMode, setAuthMode] = useState<'master' | 'credentials'>('master');
  const [masterKey, setMasterKey] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (authMode === 'master') {
        if (!masterKey.trim()) {
          setErrorMsg('Please enter your administrator master passkey.');
          setIsLoading(false);
          return;
        }
        const res = await loginWithMasterKey(masterKey.trim());
        if (!res.success) {
          setErrorMsg(res.error || 'Access denied. Invalid master passkey.');
        }
      } else {
        if (!username.trim() || !password.trim()) {
          setErrorMsg('Please enter both username and password.');
          setIsLoading(false);
          return;
        }
        const res = await loginWithCredentials(username.trim(), password.trim());
        if (!res.success) {
          setErrorMsg(res.error || 'Access denied. Invalid administrator credentials.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseQuickDevKey = () => {
    setMasterKey('yojana-admin-master-2026');
    setAuthMode('master');
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        background: 'radial-gradient(circle at 50% 20%, rgba(13, 148, 136, 0.08) 0%, transparent 60%), var(--bg-body)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '2px solid var(--border-default)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Top Warning Banner */}
        <div
          style={{
            background: 'var(--accent-navy)',
            color: '#fff',
            padding: '1.25rem 1.5rem',
            textAlign: 'center',
            borderBottom: '3px solid var(--accent-saffron)',
            position: 'relative'
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              marginBottom: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <Lock size={24} color="#f59e0b" />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem', letterSpacing: '0.5px' }}>
            ADMIN SECURITY GATEWAY
          </h2>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 600
            }}
          >
            <ShieldAlert size={12} color="#f59e0b" />
            Restricted Access • Authorized Personnel Only
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '1.75rem' }}>
          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'var(--bg-surface-elevated)',
              padding: '0.25rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <button
              type="button"
              onClick={() => { setAuthMode('master'); setErrorMsg(null); }}
              style={{
                padding: '0.55rem',
                fontSize: '0.825rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                background: authMode === 'master' ? 'var(--accent-primary)' : 'transparent',
                color: authMode === 'master' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              <KeyRound size={14} />
              Master Passkey
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('credentials'); setErrorMsg(null); }}
              style={{
                padding: '0.55rem',
                fontSize: '0.825rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                background: authMode === 'credentials' ? 'var(--accent-primary)' : 'transparent',
                color: authMode === 'credentials' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              <User size={14} />
              Admin Login
            </button>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--accent-danger)',
                borderRadius: '8px',
                color: 'var(--accent-danger)',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {authMode === 'master' ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  Master Passkey
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={masterKey}
                    onChange={e => setMasterKey(e.target.value)}
                    placeholder="Enter admin master passkey..."
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.5rem 0.75rem 0.85rem',
                      fontSize: '0.9rem',
                      background: 'var(--bg-body)',
                      border: '1.5px solid var(--border-default)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Administrator Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. admin"
                    autoFocus
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem',
                      fontSize: '0.9rem',
                      background: 'var(--bg-body)',
                      border: '1.5px solid var(--border-default)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Administrator Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter administrator password..."
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem 2.5rem 0.75rem 0.85rem',
                        fontSize: '0.9rem',
                        background: 'var(--bg-body)',
                        border: '1.5px solid var(--border-default)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.8rem',
                fontSize: '0.925rem',
                fontWeight: 700,
                background: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: isLoading ? 0.7 : 1,
                transition: 'background 0.15s ease'
              }}
            >
              {isLoading ? (
                'Verifying Security Clearance...'
              ) : (
                <>
                  <span>Unlock Admin Console</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Key helper for convenience */}
          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} color="var(--accent-primary)" />
              <span>TLS 1.3 Cryptographic Session</span>
            </div>

            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <HelpCircle size={13} />
              {showHint ? 'Hide Key' : 'Admin Passkey'}
            </button>
          </div>

          {showHint && (
            <div
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'var(--bg-surface-elevated)',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                fontSize: '0.75rem'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                Configured Master Access Key:
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-body)',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  color: 'var(--accent-saffron)'
                }}
              >
                <span>yojana-admin-master-2026</span>
                <button
                  type="button"
                  onClick={handleUseQuickDevKey}
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Use Key
                </button>
              </div>
              <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                Username: <code>admin</code> • Password: <code>adminpassword</code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

