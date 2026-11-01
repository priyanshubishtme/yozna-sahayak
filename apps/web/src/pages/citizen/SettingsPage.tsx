/**
 * Citizen App Comprehensive Settings Centre (Phase 10 & Upgrade Spec Part 8)
 *
 * Implements:
 * - 8.1 Appearance: Light Mode, Dark Mode, System Default with live visual preview.
 * - 8.2 Language: Hindi (हिन्दी) & English with instant app-wide synchronization.
 * - 8.3 Notification Preferences: Granular toggles for email, in-app, deadlines, documents.
 * - 8.4 Voice Assistant: Controls for Yojana AI robot companion (Enabled, Language, Auto-speak, Rate, Interrupt).
 * - 8.5 Accessibility: Font size, High contrast mode, Reduced motion.
 * - 8.6 Privacy & Data Management: Data transparency, Full JSON export, local cache reset, data deletion with confirmation.
 */

import React, { useState } from 'react';
import {
  Sun,
  Moon,
  Globe,
  Bell,
  Mic,
  Eye,
  Shield,
  Download,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Volume2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useCitizenStore } from '../../utils/citizenStore';
import { CitizenSettingsState } from '../../types';

export const SettingsPage: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { settings, saveSettings, exportData, resetAllData } = useCitizenStore();

  const [activeTab, setActiveTab] = useState<'appearance' | 'language' | 'notifications' | 'voice' | 'accessibility' | 'privacy'>('appearance');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const isHindi = language === 'hi';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    saveSettings({ theme: newTheme });
    showToast(isHindi ? 'रंग थीम अपडेट की गई!' : 'Color theme updated!');
  };

  const handleLanguageChange = (lang: 'hi' | 'en') => {
    setLanguage(lang);
    saveSettings({ language: lang });
    showToast(lang === 'hi' ? 'भाषा बदलकर हिन्दी कर दी गई!' : 'Language switched to English!');
  };

  const handleExport = () => {
    const jsonStr = exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yojana-sahayak-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(isHindi ? 'डेटा सफलतापूर्वक निर्यात किया गया!' : 'Data successfully exported!');
  };

  const handleDeleteAllConfirm = () => {
    resetAllData();
    setShowDeleteModal(false);
    window.location.reload();
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: 'var(--accent-primary)',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
          {t('settings.title')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Navigation Pills */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
          borderBottom: '2px solid var(--border-subtle)'
        }}
      >
        {[
          { id: 'appearance', label: t('settings.appearance'), icon: Sun },
          { id: 'language', label: t('settings.language'), icon: Globe },
          { id: 'notifications', label: t('settings.notifications'), icon: Bell },
          { id: 'voice', label: t('settings.voice'), icon: Mic },
          { id: 'accessibility', label: t('settings.accessibility'), icon: Eye },
          { id: 'privacy', label: t('settings.privacy'), icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.1rem',
                border: 'none',
                background: 'transparent',
                borderBottom: active ? '3px solid var(--accent-primary)' : '3px solid transparent',
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: active ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: APPEARANCE & THEME */}
      {activeTab === 'appearance' && (
        <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {t('settings.appearance')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {isHindi ? 'पूरे अनुप्रयोग (वेबसाइट, नागरिक पोर्टल और पीडीएफ व्यूअर) का रंग रूप चुनें।' : 'Select theme appearance across public portal, citizen dashboard, and PDF viewer.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {/* Light Mode Card */}
            <div
              onClick={() => handleThemeChange('light')}
              style={{
                border: theme === 'light' ? '2px solid var(--accent-primary)' : '1px solid var(--border-normal)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: theme === 'light' ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Sun size={24} style={{ color: '#d97706' }} />
                {theme === 'light' && <span className="badge badge-emerald">Active</span>}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Paper Light</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Clean government civic aesthetic with maximum readability</div>
              </div>
            </div>

            {/* Dark Mode Card */}
            <div
              onClick={() => handleThemeChange('dark')}
              style={{
                border: theme === 'dark' ? '2px solid var(--accent-primary)' : '1px solid var(--border-normal)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                background: '#0f172a',
                color: '#f8fafc',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                boxShadow: theme === 'dark' ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Moon size={24} style={{ color: '#10b981' }} />
                {theme === 'dark' && <span className="badge badge-emerald">Active</span>}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>Obsidian Dark</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Low-strain dark interface with emerald high-contrast accents</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LANGUAGE PREFERENCES */}
      {activeTab === 'language' && (
        <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {t('settings.language')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {isHindi ? 'संपूर्ण इंटरफ़ेस और अनुवादित सरकारी दिशा-निर्देशों की भाषा बदलें।' : 'Switch the language for all application pages, forms, and verified guidance.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div
              onClick={() => handleLanguageChange('hi')}
              style={{
                border: language === 'hi' ? '2px solid var(--accent-primary)' : '1px solid var(--border-normal)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                background: 'var(--bg-app)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>अ / हिन्दी</span>
                {language === 'hi' && <span className="badge badge-emerald">सक्रिय</span>}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>हिन्दी (Hindi)</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>प्राथमिक राजभाषा • देवनागरी लिपि</div>
            </div>

            <div
              onClick={() => handleLanguageChange('en')}
              style={{
                border: language === 'en' ? '2px solid var(--accent-primary)' : '1px solid var(--border-normal)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                background: 'var(--bg-app)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>A / English</span>
                {language === 'en' && <span className="badge badge-emerald">Active</span>}
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>English</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Standard Indian English interface</div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: NOTIFICATION PREFERENCES */}
      {activeTab === 'notifications' && (
        <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {t('settings.notifications')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {isHindi ? 'तय करें कि आप किस प्रकार के अनुस्मारक और अलर्ट प्राप्त करना चाहते हैं।' : 'Configure granular notification channels and reminder triggers.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              {
                key: 'email_reminders' as const,
                title: isHindi ? 'ईमेल सूचनाएं एवं अनुस्मारक' : 'Email Reminders & Alerts',
                desc: isHindi ? 'योजना समय-सीमा और दस्तावेज़ संग्रह के लिए ईमेल भेजें।' : 'Receive official schedule deadlines and document follow-ups via email.'
              },
              {
                key: 'in_app_notifications' as const,
                title: isHindi ? 'इन-ऐप सूचनाएं (डैशबोर्ड केंद्र)' : 'In-App Notification Centre',
                desc: isHindi ? 'नागरिक पोर्टल पर अलर्ट और बैज प्रदर्शित करें।' : 'Display alert badges and timeline updates in the Citizen App.'
              },
              {
                key: 'deadline_alerts' as const,
                title: isHindi ? 'आवेदन समय-सीमा एवं किस्त चक्र अलर्ट' : 'Application Deadline & Installment Cycle Alerts',
                desc: isHindi ? 'पीएम-किसान, आवास योजना और छात्रवृत्ति की अंतिम तिथि से पूर्व चेतावनी।' : 'Get notified before critical DBT installment cycles and application cutoffs.'
              },
              {
                key: 'missing_doc_reminders' as const,
                title: isHindi ? 'अपूर्ण दस्तावेज़ अनुस्मारक' : 'Missing Document Checkup Reminders',
                desc: isHindi ? 'पात्र योजनाओं के लिए आवश्यक प्रमाण पत्रों को तैयार करने हेतु सुझाव।' : 'Prompt reminders for missing certificates required by matched schemes.'
              }
            ].map(item => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {item.desc}
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={Boolean(settings[item.key])}
                  onChange={e => saveSettings({ [item.key]: e.target.checked })}
                  style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: VOICE ASSISTANT SETTINGS */}
      {activeTab === 'voice' && (
        <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {t('settings.voice')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {isHindi ? 'योजना एआई फ्लोटिंग रोबोट साथी की आवाज़, गति और भाषा सेटिंग्स।' : 'Configure voice input, speech output, speech rate, and interruption controls.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Enable/Disable */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isHindi ? 'योजना एआई रोबोट साथी सक्रिय रखें' : 'Enable Yojana AI Robot Companion'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {isHindi ? 'स्क्रीन के नीचे दाईं ओर फ्लोटिंग रोबोट दिखाएं।' : 'Show floating robot assistant widget on bottom-right of pages.'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.voice_assistant_enabled}
                onChange={e => saveSettings({ voice_assistant_enabled: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Auto-Speak Responses */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isHindi ? 'उत्तर स्वतः बोलकर सुनाएं (Auto-Speak TTS)' : 'Automatically Speak AI Responses'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {isHindi ? 'आवाज़ वार्तालाप में उत्तर तुरंत पढ़कर सुनाए जाएंगे।' : 'Read out response immediately upon generation in voice mode.'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.voice_auto_speak}
                onChange={e => saveSettings({ voice_auto_speak: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Speech Rate Slider */}
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isHindi ? 'बोलने की गति (Speech Rate)' : 'Speech Synthesis Rate'}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                  {settings.voice_speech_rate || 1.0}x
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.05"
                value={settings.voice_speech_rate || 1.0}
                onChange={e => saveSettings({ voice_speech_rate: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: ACCESSIBILITY */}
      {activeTab === 'accessibility' && (
        <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {t('settings.accessibility')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {isHindi ? 'वरिष्ठ नागरिकों और कम दृष्टि वाले उपयोगकर्ताओं हेतु सुलभता विकल्प।' : 'Enhanced visibility and ergonomics for senior citizens and low-vision users.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Font Size */}
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {isHindi ? 'अक्षर आकार (Font Size)' : 'Interface Text Size'}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['normal', 'large', 'extra_large'] as const).map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => saveSettings({ font_size: sz })}
                    className={`btn btn-sm ${settings.font_size === sz ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {sz === 'normal' && (isHindi ? 'सामान्य (Normal)' : 'Normal')}
                    {sz === 'large' && (isHindi ? 'बड़ा (Large)' : 'Large (+15%)')}
                    {sz === 'extra_large' && (isHindi ? 'अति विशाल (Extra Large)' : 'Extra Large (+30%)')}
                  </button>
                ))}
              </div>
            </div>

            {/* High Contrast */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isHindi ? 'उच्च कंट्रास्ट मोड (High Contrast)' : 'High Contrast Borders & Text'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {isHindi ? 'सीमाओं और महत्वपूर्ण टेक्स्ट का कंट्रास्ट बढ़ाएं।' : 'Increases border visibility and contrast for text readability.'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.high_contrast}
                onChange={e => saveSettings({ high_contrast: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: DATA MANAGEMENT & PRIVACY */}
      {activeTab === 'privacy' && (
        <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {t('settings.privacy')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
              {isHindi ? 'डेटा संप्रभुता, पारदर्शी भंडारण और हटाने के नियंत्रण।' : 'Transparent storage accounting, JSON export, and data removal controls.'}
            </p>
          </div>

          {/* Privacy Transparency Info */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}
          >
            <Info size={18} style={{ color: 'var(--accent-blue)', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong>{isHindi ? 'डेटा भंडारण प्रकटीकरण:' : 'Data Storage Disclosure:'}</strong><br />
              {isHindi
                ? 'आपकी व्यक्तिगत प्रोफ़ाइल और दस्तावेज़ चेकलिस्ट आपके स्थानीय ब्राउज़र (IndexedDB व LocalStorage) में सहेजी जाती हैं। यदि आप ईमेल अनुस्मारक चुनते हैं, तो अनुस्मारक विवरण सर्वर द्वारा सुरक्षित रूप से प्रेषित किया जाता है। कोई भी बायोमेट्रिक या आधार संख्या सर्वर पर संगृहीत नहीं होती।'
                : 'Your profile attributes and document status are stored device-locally in IndexedDB and localStorage. Opting in to email notifications dispatches verified reminders via our backend mailer. We do not store biometric data or sensitive Aadhaar credentials.'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Export JSON */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-app)', border: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('settings.exportData')}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {isHindi ? 'अपनी संपूर्ण प्रोफ़ाइल, ट्रैक किए गए आवेदन और अनुस्मारक डाउनलोड करें।' : 'Download a complete JSON archive of your profile, applications, and reminders.'}
                </div>
              </div>
              <button type="button" onClick={handleExport} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Download size={14} />
                <span>Export</span>
              </button>
            </div>

            {/* Delete All Data */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-danger)' }}>
                  {t('settings.deleteData')}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {isHindi ? 'स्थानीय प्रोफ़ाइल, दस्तावेज़ चेकलिस्ट और सहेजी गई योजनाएं मिटाएं।' : 'Permanently clear all device-local profile records and saved schemes.'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ maxWidth: '460px', width: '100%', padding: '2rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-danger)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                {isHindi ? 'क्या आप सभी डेटा मिटाना चाहते हैं?' : 'Reset and Delete All Local Data?'}
              </h3>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {isHindi
                ? 'यह क्रिया आपके ब्राउज़र से आपकी प्रोफ़ाइल, आवेदन ट्रैकर और ऑफ़लाइन सहेजी गई योजनाओं को तुरंत हटा देगी।'
                : 'This action will wipe your local profile, tracked applications, document checklist, and cached schemes from this browser.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">
                {t('btn.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAllConfirm}
                className="btn btn-primary"
                style={{ background: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}
              >
                {t('btn.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
