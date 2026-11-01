/**
 * Comprehensive Citizen Profile & Document Readiness System (Phase 10 & Upgrade Spec Part 2)
 *
 * Implements:
 * - Structured Multi-Section Form: Personal, Occupation, Financial, Education.
 * - Dynamic conditional fields based on occupation (Farmer land details, Student education level, Employee type).
 * - "My Documents": 14 official document checklist with 4-state readiness indicators.
 * - Distinct Profile Completeness and Document Readiness metrics.
 * - Full data management: Save, Edit, Cancel, Reset, Delete (with modal confirmation), and JSON Export.
 * - Direct integration with citizenStore and automated eligibility re-evaluation.
 */

import React, { useState } from 'react';
import {
  User,
  Briefcase,
  Wallet,
  GraduationCap,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Clock,
  HelpCircle,
  Save,
  RotateCcw,
  Trash2,
  Download,
  Info,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCitizenStore, CORE_DOCUMENTS } from '../../utils/citizenStore';
import { CitizenProfile, DocumentStatus } from '../../types';

export const CitizenProfilePage: React.FC = () => {
  const { language, t } = useLanguage();
  const {
    profile,
    stats,
    saveProfile,
    updateDocument,
    exportData,
    resetAllData
  } = useCitizenStore();

  const [formData, setFormData] = useState<CitizenProfile>(profile);
  const [activeTab, setActiveTab] = useState<'personal' | 'occupation' | 'financial' | 'education' | 'documents'>('personal');
  const [docFilter, setDocFilter] = useState<'all' | 'available' | 'missing' | 'not_applicable'>('all');
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const isHindi = language === 'hi';

  const handleChange = (field: keyof CitizenProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile(formData);
    setSavedToast(isHindi ? 'प्रोफ़ाइल सफलतापूर्वक सहेज दी गई!' : 'Profile saved and recommendations updated!');
    setTimeout(() => setSavedToast(null), 3000);
  };

  const handleReset = () => {
    if (window.confirm(isHindi ? 'क्या आप प्रोफ़ाइल को रीसेट करना चाहते हैं?' : 'Reset profile to default values?')) {
      setFormData(profile);
    }
  };

  const handleExport = () => {
    const jsonStr = exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yojana-citizen-profile-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteConfirm = () => {
    resetAllData();
    setShowDeleteModal(false);
    window.location.reload();
  };

  // Filtered documents
  const filteredDocs = CORE_DOCUMENTS.filter(doc => {
    const st = (formData.documents || {})[doc.key] || 'missing';
    if (docFilter === 'all') return true;
    return st === docFilter;
  });

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast Notification */}
      {savedToast && (
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
            fontSize: '0.9rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{savedToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), var(--bg-surface))',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-normal)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
              <span className="badge badge-emerald">
                {isHindi ? 'नागरिक सेवा अभिलेख' : 'Citizen Intelligence Profile'}
              </span>
              <span className="badge badge-saffron">
                {formData.state || 'All India'}
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {t('profile.title')}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: '0.4rem 0 0 0', maxWidth: '640px' }}>
              {t('profile.subtitle')}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleExport} className="btn btn-secondary btn-sm" title="Export Profile JSON">
              <Download size={15} />
              <span>{t('profile.export')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--accent-danger)' }}
              title="Delete Profile"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Dual Progress Bars: Profile Completeness vs Document Readiness */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          {/* 1. Profile Completeness */}
          <div
            style={{
              background: 'var(--bg-app)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={15} style={{ color: 'var(--accent-primary)' }} />
                <span>{t('dashboard.completeness')}</span>
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {stats.profileCompleteness}%
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${stats.profileCompleteness}%`,
                  background: 'linear-gradient(90deg, var(--accent-primary), #059669)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              {isHindi ? 'व्यक्तिगत, व्यावसायिक एवं वित्तीय जानकारी की पूर्णता' : 'Essential profile attributes completed'}
            </div>
          </div>

          {/* 2. Document Readiness */}
          <div
            style={{
              background: 'var(--bg-app)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileCheck2 size={15} style={{ color: 'var(--accent-saffron)' }} />
                <span>{t('dashboard.readiness')}</span>
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-saffron)' }}>
                {stats.documentReadiness}% ({stats.availableDocsCount}/{CORE_DOCUMENTS.length})
              </span>
            </div>
            <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${stats.documentReadiness}%`,
                  background: 'linear-gradient(90deg, var(--accent-saffron), #d97706)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              {isHindi ? `${stats.missingDocsCount} दस्तावेज़ अभी अपूर्ण/लंबित हैं` : `${stats.missingDocsCount} documents missing or pending`}
            </div>
          </div>
        </div>
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
          { id: 'personal', label: t('profile.personal'), icon: User },
          { id: 'occupation', label: t('profile.occupation'), icon: Briefcase },
          { id: 'financial', label: t('profile.financial'), icon: Wallet },
          { id: 'education', label: t('profile.education'), icon: GraduationCap },
          { id: 'documents', label: t('profile.documents'), icon: FileCheck2, badge: `${stats.availableDocsCount}` }
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
              {tab.badge && (
                <span
                  style={{
                    background: active ? 'var(--accent-primary)' : 'var(--border-normal)',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontWeight: 700
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* TAB 1: PERSONAL INFORMATION */}
        {activeTab === 'personal' && (
          <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>{t('profile.personal')}</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.fullName')}
                </label>
                <input
                  type="text"
                  value={formData.full_name || ''}
                  onChange={e => handleChange('full_name', e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Age */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.age')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={formData.age || ''}
                  onChange={e => handleChange('age', Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.dob')}
                </label>
                <input
                  type="date"
                  value={formData.dob || ''}
                  onChange={e => handleChange('dob', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Gender */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.gender')}
                </label>
                <select
                  value={formData.gender || ''}
                  onChange={e => handleChange('gender', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="female">{isHindi ? 'महिला (Female)' : 'Female'}</option>
                  <option value="male">{isHindi ? 'पुरुष (Male)' : 'Male'}</option>
                  <option value="transgender">{isHindi ? 'उभयलिंगी (Transgender)' : 'Transgender'}</option>
                  <option value="prefer_not_to_say">{isHindi ? 'बताना नहीं चाहते' : 'Prefer not to say'}</option>
                </select>
              </div>

              {/* State of Domicile */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.state')}
                </label>
                <select
                  value={formData.state || ''}
                  onChange={e => handleChange('state', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="Uttarakhand">Uttarakhand (उत्तराखंड)</option>
                  <option value="Uttar Pradesh">Uttar Pradesh (उत्तर प्रदेश)</option>
                  <option value="Bihar">Bihar (बिहार)</option>
                  <option value="Madhya Pradesh">Madhya Pradesh (मध्य प्रदेश)</option>
                  <option value="Rajasthan">Rajasthan (राजस्थान)</option>
                  <option value="Delhi">Delhi (दिल्ली)</option>
                  <option value="All India">All India / Other</option>
                </select>
              </div>

              {/* District */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.district')}
                </label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={e => handleChange('district', e.target.value)}
                  placeholder="e.g. Dehradun, Haridwar, Almora"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Residence Area */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.area')}
                </label>
                <select
                  value={formData.residence_area || 'rural'}
                  onChange={e => handleChange('residence_area', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="rural">{isHindi ? 'ग्रामीण (Rural)' : 'Rural'}</option>
                  <option value="urban">{isHindi ? 'शहरी (Urban)' : 'Urban'}</option>
                  <option value="semi_urban">{isHindi ? 'अर्ध-शहरी (Semi-Urban)' : 'Semi-Urban'}</option>
                </select>
              </div>

              {/* Marital Status */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.marital')}
                </label>
                <select
                  value={formData.marital_status || 'married'}
                  onChange={e => handleChange('marital_status', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="single">{isHindi ? 'अविवाहित (Single)' : 'Single'}</option>
                  <option value="married">{isHindi ? 'विवाहित (Married)' : 'Married'}</option>
                  <option value="widowed">{isHindi ? 'विधवा / विधुर (Widowed)' : 'Widowed'}</option>
                  <option value="divorced">{isHindi ? 'तलाकशुदा / परित्यक्ता (Divorced)' : 'Divorced / Separated'}</option>
                </select>
              </div>

              {/* Social Category */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.socialCat')}
                </label>
                <select
                  value={formData.social_category || 'General'}
                  onChange={e => handleChange('social_category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="General">General / सामान्य</option>
                  <option value="OBC">OBC / अन्य पिछड़ा वर्ग</option>
                  <option value="SC">SC / अनुसूचित जाति</option>
                  <option value="ST">ST / अनुसूचित जनजाति</option>
                  <option value="EWS">EWS / आर्थिक रूप से कमजोर वर्ग</option>
                </select>
              </div>

              {/* Disability Check */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="differently_abled"
                  checked={Boolean(formData.is_differently_abled)}
                  onChange={e => handleChange('is_differently_abled', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="differently_abled" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  {isHindi ? 'दिव्यांग व्यक्ति (Persons with Disabilities / UDID)' : 'Person with Disability (PwD)'}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OCCUPATION & EMPLOYMENT */}
        {activeTab === 'occupation' && (
          <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>{t('profile.occupation')}</span>
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                {isHindi ? 'प्राथमिक व्यवसाय चयन' : 'Primary Occupation'}
              </label>
              <select
                value={formData.occupation || 'Farmer / Landholder'}
                onChange={e => handleChange('occupation', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-normal)',
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontWeight: 600
                }}
              >
                <option value="Farmer / Landholder">🌾 {isHindi ? 'किसान / भूस्वामी (Farmer / Landholder)' : 'Farmer / Landholder'}</option>
                <option value="Agricultural Worker">🚜 {isHindi ? 'कृषि श्रमिक (Agricultural Worker)' : 'Agricultural Worker'}</option>
                <option value="Student">🎓 {isHindi ? 'विद्यार्थी / छात्र (Student)' : 'Student'}</option>
                <option value="Government Employee">🏛️ {isHindi ? 'सरकारी कर्मचारी (Government Employee)' : 'Government Employee'}</option>
                <option value="Private Sector Employee">💼 {isHindi ? 'निजी क्षेत्र कर्मचारी (Private Sector Employee)' : 'Private Sector Employee'}</option>
                <option value="Self-employed">🛠️ {isHindi ? 'स्वरोजगार (Self-employed)' : 'Self-employed'}</option>
                <option value="Business Owner">🏪 {isHindi ? 'व्यापारी / सूक्ष्म उद्यमी (Business Owner / MSME)' : 'Business Owner / MSME'}</option>
                <option value="Daily Wage Worker">🔨 {isHindi ? 'दैनिक वेतनभोगी श्रमिक (Daily Wage Worker)' : 'Daily Wage Worker'}</option>
                <option value="Unemployed">⏳ {isHindi ? 'बेरोजगार (Unemployed)' : 'Unemployed'}</option>
                <option value="Homemaker">🏡 {isHindi ? 'गृहणी (Homemaker)' : 'Homemaker'}</option>
                <option value="Senior Citizen / Retired">👵 {isHindi ? 'वरिष्ठ नागरिक / सेवानिवृत्त (Senior Citizen / Retired)' : 'Senior Citizen / Retired'}</option>
                <option value="Other">✨ {isHindi ? 'अन्य (Other)' : 'Other'}</option>
              </select>
            </div>

            {/* CONDITIONAL SECTION: FARMER SPECIFICS */}
            {(formData.occupation === 'Farmer / Landholder' || formData.occupation === 'Agricultural Worker') && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🌾 {isHindi ? 'कृषि एवं भूमि विवरण' : 'Agricultural & Land Details'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                      {isHindi ? 'भूमि स्वामित्व स्थिति' : 'Land Ownership Status'}
                    </label>
                    <select
                      value={formData.land_ownership || 'own'}
                      onChange={e => handleChange('land_ownership', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-normal)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="own">{isHindi ? 'स्वयं की भूमि (Own Land)' : 'Own Land'}</option>
                      <option value="tenant">{isHindi ? 'बटाईदार / पट्टाधारक (Tenant Farmer)' : 'Tenant Farmer'}</option>
                      <option value="sharecropper">{isHindi ? 'साझेदार (Sharecropper)' : 'Sharecropper'}</option>
                      <option value="none">{isHindi ? 'भूमिहीन (Landless)' : 'Landless'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                      {isHindi ? 'कृषि भूमि का क्षेत्रफल (एकड़ में)' : 'Total Landholding (in Acres)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.landholding_acres || ''}
                      onChange={e => {
                        const val = Number(e.target.value);
                        let cat = 'marginal';
                        if (val > 10) cat = 'large';
                        else if (val > 5) cat = 'medium';
                        else if (val >= 2.5) cat = 'small';
                        setFormData(prev => ({ ...prev, landholding_acres: val, landholding_category: cat }));
                      }}
                      placeholder="e.g. 2.2"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-normal)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                      {isHindi ? 'कृषक श्रेणी' : 'Farmer Category'}
                    </label>
                    <select
                      value={formData.landholding_category || 'marginal'}
                      onChange={e => handleChange('landholding_category', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-normal)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="marginal">{isHindi ? 'सीमान्त किसान (< 2.5 एकड़ / 1 हेक्टेयर)' : 'Marginal Farmer (< 2.5 Acres)'}</option>
                      <option value="small">{isHindi ? 'लघु किसान (2.5 - 5 एकड़)' : 'Small Farmer (2.5 - 5 Acres)'}</option>
                      <option value="medium">{isHindi ? 'मध्यम किसान (5 - 10 एकड़)' : 'Medium Farmer (5 - 10 Acres)'}</option>
                      <option value="large">{isHindi ? 'बड़ा कृषक (> 10 एकड़)' : 'Large Farmer (> 10 Acres)'}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* CONDITIONAL SECTION: STUDENT SPECIFICS */}
            {formData.occupation === 'Student' && (
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.05)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🎓 {isHindi ? 'छात्रवृत्ति एवं शैक्षणिक विवरण' : 'Scholarship & Academic Details'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                      {isHindi ? 'वर्तमान अध्ययन स्तर' : 'Current Study Level'}
                    </label>
                    <select
                      value={formData.current_education_level || 'Undergraduate'}
                      onChange={e => handleChange('current_education_level', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-normal)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="Secondary">{isHindi ? 'माध्यमिक (कक्षा 9-10)' : 'Secondary (Class 9-10)'}</option>
                      <option value="Higher Secondary">{isHindi ? 'उच्च माध्यमिक (कक्षा 11-12)' : 'Higher Secondary (Class 11-12)'}</option>
                      <option value="Undergraduate">{isHindi ? 'स्नातक (UG Degree/Diploma)' : 'Undergraduate (UG / Diploma)'}</option>
                      <option value="Postgraduate">{isHindi ? 'स्नातकोत्तर (PG / Research)' : 'Postgraduate (PG / PhD)'}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                      {isHindi ? 'संस्थान का प्रकार' : 'Institution Type'}
                    </label>
                    <select
                      value={formData.institution_type || 'government'}
                      onChange={e => handleChange('institution_type', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-normal)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="government">{isHindi ? 'शासकीय / सरकारी (Government)' : 'Government'}</option>
                      <option value="private_aided">{isHindi ? 'शासकीय सहायता प्राप्त (Govt Aided)' : 'Government Aided'}</option>
                      <option value="private_unaided">{isHindi ? 'निजी संस्थान (Private)' : 'Private'}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FINANCIAL INFORMATION */}
        {activeTab === 'financial' && (
          <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wallet size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>{t('profile.financial')}</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {/* Annual Family Income */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.income')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={formData.annual_family_income || ''}
                  onChange={e => {
                    const inc = Number(e.target.value);
                    let band = '< 1 Lakh';
                    if (inc > 800000) band = '> 8 Lakhs';
                    else if (inc > 500000) band = '5 - 8 Lakhs';
                    else if (inc > 250000) band = '2.5 - 5 Lakhs';
                    else if (inc >= 100000) band = '1 - 2.5 Lakhs';
                    setFormData(prev => ({ ...prev, annual_family_income: inc, annual_income_band: band }));
                  }}
                  placeholder="e.g. 180000"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Annual Income Band */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  {t('profile.incomeBand')}
                </label>
                <select
                  value={formData.annual_income_band || '1 - 2.5 Lakhs'}
                  onChange={e => handleChange('annual_income_band', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-normal)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="< 1 Lakh">&lt; ₹1,00,000 (गरीबी रेखा से नीचे / EWS)</option>
                  <option value="1 - 2.5 Lakhs">₹1,00,000 - ₹2,50,000 (लघु आय वर्ग)</option>
                  <option value="2.5 - 5 Lakhs">₹2,50,000 - ₹5,00,000 (मध्यम आय वर्ग)</option>
                  <option value="5 - 8 Lakhs">₹5,00,000 - ₹8,00,000 (गैर-क्रीमी लेयर)</option>
                  <option value="> 8 Lakhs">&gt; ₹8,00,000 (उच्च आय वर्ग / क्रीमी लेयर)</option>
                </select>
              </div>

              {/* BPL Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="bpl_status"
                  checked={Boolean(formData.is_bpl)}
                  onChange={e => handleChange('is_bpl', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="bpl_status" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  {t('profile.bpl')}
                </label>
              </div>

              {/* Official Income Certificate */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="has_income_cert"
                  checked={Boolean(formData.has_income_certificate)}
                  onChange={e => handleChange('has_income_certificate', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                />
                <label htmlFor="has_income_cert" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  {t('profile.hasIncomeCert')}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EDUCATION */}
        {activeTab === 'education' && (
          <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={18} style={{ color: 'var(--accent-primary)' }} />
              <span>{t('profile.education')}</span>
            </h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                {isHindi ? 'उच्चतम पूर्ण शैक्षणिक स्तर' : 'Highest Educational Level Completed'}
              </label>
              <select
                value={formData.education_level || 'Higher Secondary'}
                onChange={e => handleChange('education_level', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-normal)',
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="No Formal Education">{isHindi ? 'कोई औपचारिक शिक्षा नहीं (No Formal Education)' : 'No Formal Education'}</option>
                <option value="Primary">{isHindi ? 'प्राथमिक (कक्षा 1-5)' : 'Primary (Class 1-5)'}</option>
                <option value="Secondary">{isHindi ? 'माध्यमिक / 10वीं पास (Class 10th)' : 'Secondary (Class 10)'}</option>
                <option value="Higher Secondary">{isHindi ? 'उच्च माध्यमिक / 12वीं पास (Class 12th)' : 'Higher Secondary (Class 12)'}</option>
                <option value="Undergraduate">{isHindi ? 'स्नातक / डिप्लोमा (Undergraduate / Diploma)' : 'Undergraduate / Diploma'}</option>
                <option value="Postgraduate">{isHindi ? 'स्नातकोत्तर (Postgraduate)' : 'Postgraduate'}</option>
                <option value="Doctorate">{isHindi ? 'डॉक्टरेट / शोध (PhD / Doctorate)' : 'Doctorate'}</option>
                <option value="Other">{isHindi ? 'अन्य व्यावसायिक प्रशिक्षण' : 'Other Vocational'}</option>
              </select>
            </div>
          </div>
        )}

        {/* TAB 5: MY DOCUMENTS CHECKLIST */}
        {activeTab === 'documents' && (
          <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCheck2 size={18} style={{ color: 'var(--accent-saffron)' }} />
                  <span>{t('profile.documents')}</span>
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  {isHindi
                    ? 'चिह्नित करें कि कौन-से दस्तावेज़ आपके पास भौतिक या डिजीलॉकर में उपलब्ध हैं।'
                    : 'Track which government documents you currently possess or have in DigiLocker.'}
                </p>
              </div>

              {/* Status Filters */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {(['all', 'available', 'missing', 'not_applicable'] as const).map(flt => (
                  <button
                    key={flt}
                    type="button"
                    onClick={() => setDocFilter(flt)}
                    className={`btn btn-sm ${docFilter === flt ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  >
                    {flt === 'all' && (isHindi ? 'सभी दस्तावेज़' : 'All Docs')}
                    {flt === 'available' && `✓ ${t('doc.available')} (${stats.availableDocsCount})`}
                    {flt === 'missing' && `⚠️ ${t('doc.missing')} (${stats.missingDocsCount})`}
                    {flt === 'not_applicable' && t('doc.not_applicable')}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredDocs.map((doc, idx) => {
                const currentStatus: DocumentStatus = (formData.documents || {})[doc.key] || 'missing';

                return (
                  <div
                    key={doc.id}
                    style={{
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      transition: 'border-color var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', maxWidth: '540px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: currentStatus === 'available' ? 'var(--accent-primary-light)' : 'var(--border-subtle)',
                          color: currentStatus === 'available' ? 'var(--accent-primary)' : 'var(--text-muted)'
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {isHindi ? doc.name_hi : doc.name_en}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {isHindi ? doc.description_hi : doc.description_en}
                        </div>
                      </div>
                    </div>

                    {/* 4-State Document Readiness Selector */}
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => updateDocument(doc.key, 'available')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: currentStatus === 'available' ? '1px solid var(--accent-primary)' : '1px solid var(--border-normal)',
                          background: currentStatus === 'available' ? 'var(--accent-primary)' : 'transparent',
                          color: currentStatus === 'available' ? '#ffffff' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ {t('doc.available')}
                      </button>

                      <button
                        type="button"
                        onClick={() => updateDocument(doc.key, 'missing')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: currentStatus === 'missing' ? '1px solid var(--accent-saffron)' : '1px solid var(--border-normal)',
                          background: currentStatus === 'missing' ? 'var(--accent-saffron-light)' : 'transparent',
                          color: currentStatus === 'missing' ? 'var(--accent-saffron)' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        ⚠️ {t('doc.missing')}
                      </button>

                      <button
                        type="button"
                        onClick={() => updateDocument(doc.key, 'not_applicable')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: currentStatus === 'not_applicable' ? '1px solid var(--text-muted)' : '1px solid var(--border-normal)',
                          background: currentStatus === 'not_applicable' ? 'var(--border-subtle)' : 'transparent',
                          color: 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {t('doc.not_applicable')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-surface)',
            padding: '1.25rem 1.75rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-normal)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <button type="button" onClick={handleReset} className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RotateCcw size={15} />
            <span>{t('profile.reset')}</span>
          </button>

          <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem' }}>
            <Save size={18} />
            <span>{t('profile.save')}</span>
          </button>
        </div>
      </form>

      {/* Confirmation Modal for Profile Deletion */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-danger)' }}>
              <Trash2 size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {isHindi ? 'स्थानीय प्रोफ़ाइल मिटाएं?' : 'Delete Local Profile Data?'}
              </h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {isHindi
                ? 'यह क्रिया आपके ब्राउज़र में संगृहीत सभी व्यक्तिगत विवरण, दस्तावेज़ स्थिति और सहेजी गई योजनाओं को स्थायी रूप से हटा देगी।'
                : 'This action will permanently delete all your local profile attributes, tracked documents, and saved schemes from this browser.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">
                {t('btn.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
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
