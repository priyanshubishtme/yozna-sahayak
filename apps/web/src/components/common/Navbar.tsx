/**
 * Main Navigation Header — Neo-Brutalist Indian Civic Design
 * Matches the official Yojana Sahayak brand design system.
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, WifiOff, Lock, User, CheckCircle2, ChevronDown } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

export const Navbar: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitor network online/offline transitions
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <header className="yl-head">
        {/* Brand Logo */}
        <Link to="/" className="yl-brand" aria-label="Yojana Sahayak Home">
          <span className="yl-logo">
            <ShieldCheck size={22} />
          </span>
          <span>
            <b>{language === 'hi' ? 'योजना सहायक' : 'Yojana Sahayak'}</b>
            <small>{language === 'hi' ? 'सरकारी योजना इंटेलिजेंस' : 'GOV SCHEME INTELLIGENCE'}</small>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav id="nv" className={mobileMenuOpen ? 'open' : ''}>
          <Link
            to="/schemes"
            className={isActive('/schemes') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            {language === 'hi' ? 'योजनाएँ' : 'Schemes'}
          </Link>

          <Link
            to="/eligibility"
            className={isActive('/eligibility') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            {language === 'hi' ? 'पात्रता जांच' : 'Eligibility'}
          </Link>

          <Link
            to="/compare"
            className={isActive('/compare') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            {language === 'hi' ? 'तुलना' : 'Compare'}
          </Link>

          <Link
            to="/chat"
            className={`chat ${isActive('/chat') ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            {language === 'hi' ? 'AI चैटबॉट (RAG)' : 'AI Chatbot (RAG)'}
          </Link>

          <Link
            to="/centre-locator"
            className={isActive('/centre-locator') ? 'active' : ''}
            onClick={() => setMobileMenuOpen(false)}
          >
            {language === 'hi' ? 'केंद्र खोजें' : 'Centre Locator'}
          </Link>

          <Link
            to="/app"
            className={`cta ${isActive('/app') ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            {language === 'hi' ? 'नागरिक ऐप' : 'Citizen App'}
          </Link>

          <Link
            to="/admin"
            className="ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            onClick={() => setMobileMenuOpen(false)}
            title={isAdminAuthenticated ? "Administrator Console (Unlocked)" : "Administrator Console (Restricted - Master Key Required)"}
          >
            {!isAdminAuthenticated && <Lock size={13} style={{ opacity: 0.75 }} />}
            {isAdminAuthenticated && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
            <span>{language === 'hi' ? 'एडमिन कंसोल' : 'Admin Console'}</span>
          </Link>
        </nav>

        {/* Controls: Language, Theme, Mobile Menu */}
        <div className="yl-tools">
          <button
            className="yl-ic"
            type="button"
            onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
            title={language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
          >
            {language === 'hi' ? 'English' : 'हिन्दी'}
          </button>

          <button
            className="yl-ic"
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark'
                ? (language === 'hi' ? 'लाइट थीम' : 'Light Mode')
                : theme === 'light'
                ? (language === 'hi' ? 'डार्क थीम' : 'Dark Mode')
                : (language === 'hi' ? 'सिस्टम थीम' : 'System Theme')
            }
            title={
              theme === 'dark'
                ? (language === 'hi' ? 'लाइट थीम (क्लिक करें)' : 'Theme: Dark (Click to switch)')
                : theme === 'light'
                ? (language === 'hi' ? 'डार्क थीम (क्लिक करें)' : 'Theme: Light (Click to switch)')
                : (language === 'hi' ? 'सिस्टम थीम (क्लिक करें)' : 'Theme: System (Click to switch)')
            }
          >
            {theme === 'dark' ? '☀' : theme === 'light' ? '🌙' : '💻'}
          </button>

          <button
            className="yl-ic menu"
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Global PWA Offline Banner */}
      {isOffline && (
        <div
          style={{
            background: 'var(--saf)',
            color: '#1b1f3b',
            padding: '0.45rem 1rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            borderBottom: '2px solid var(--ink)',
          }}
        >
          <WifiOff size={16} />
          <span>
            {language === 'hi'
              ? 'ऑफ़लाइन मोड: सहेजी गई योजनाएं उपलब्ध हैं। लाइव चैट एवं पात्रता गणना के लिए इंटरनेट आवश्यक है।'
              : 'Offline Mode: Saved schemes & checklists are accessible. Live AI chat requires an internet connection.'}
          </span>
        </div>
      )}
    </>
  );
};

export default Navbar;
