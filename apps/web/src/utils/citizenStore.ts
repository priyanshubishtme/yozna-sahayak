/**
 * Unified Citizen App Data Store and Synchronization Engine.
 *
 * Provides single-source-of-truth state management for:
 * - Citizen Profile (Personal, Occupation, Financial, Education)
 * - My Documents Checklist (14 core documents with 4-state readiness)
 * - Deterministic Eligibility & Personalized Recommendations Cache
 * - Application Tracker (Status pipeline, reference numbers, dates, notes)
 * - Notifications & Reminders (In-app alerts, email scheduling, delivery tracking)
 * - Recent Activity Stream
 * - Application-wide Settings (Theme, Language, Voice, Accessibility, Privacy)
 */

import { useState, useEffect } from 'react';
import {
  CitizenProfile,
  DocumentItemInfo,
  DocumentStatus,
  CitizenApplication,
  CitizenReminder,
  CitizenActivity,
  CitizenSettingsState,
  RankedSchemeRecommendation
} from '../types';

export const CORE_DOCUMENTS: Omit<DocumentItemInfo, 'status'>[] = [
  {
    id: 'doc-aadhaar',
    key: 'aadhaar',
    name_en: 'Aadhaar Card',
    name_hi: 'आधार कार्ड',
    description_en: 'Universal 12-digit biometric identity document',
    description_hi: '12 अंकों का बायोमेट्रिक विशिष्ट पहचान पत्र',
    category: 'identity'
  },
  {
    id: 'doc-pan',
    key: 'pan_card',
    name_en: 'PAN Card',
    name_hi: 'पैन कार्ड',
    description_en: 'Permanent Account Number issued by Income Tax Dept',
    description_hi: 'आयकर विभाग द्वारा जारी स्थायी खाता संख्या',
    category: 'identity'
  },
  {
    id: 'doc-voter-id',
    key: 'voter_id',
    name_en: 'Voter ID (EPIC)',
    name_hi: 'मतदाता पहचान पत्र',
    description_en: 'Electoral Photo Identity Card from Election Commission',
    description_hi: 'भारत निर्वाचन आयोग द्वारा जारी फोटो पहचान पत्र',
    category: 'identity'
  },
  {
    id: 'doc-ration',
    key: 'ration_card',
    name_en: 'Ration Card (NFSA / BPL / AAY)',
    name_hi: 'राशन कार्ड (बीपीएल / अंत्योदय)',
    description_en: 'Official food security & household category booklet',
    description_hi: 'राष्ट्रीय खाद्य सुरक्षा एवं परिवार श्रेणी पुस्तिका',
    category: 'income'
  },
  {
    id: 'doc-income',
    key: 'income_certificate',
    name_en: 'Income Certificate',
    name_hi: 'आय प्रमाण पत्र',
    description_en: 'Tehsildar / Revenue officer certified family income certificate',
    description_hi: 'तहसीलदार/राजस्व अधिकारी द्वारा प्रमाणित आय प्रमाण पत्र',
    category: 'income'
  },
  {
    id: 'doc-caste',
    key: 'caste_certificate',
    name_en: 'Caste Certificate (SC/ST/OBC/EWS)',
    name_hi: 'जाति प्रमाण पत्र (अ.जा/अ.ज.जा/अन्य पिछड़ा वर्ग/ईडब्ल्यूएस)',
    description_en: 'Competent authority certificate for reservation & welfare entitlement',
    description_hi: 'आरक्षण एवं कल्याणकारी योजनाओं हेतु प्राधिकृत प्रमाण पत्र',
    category: 'other'
  },
  {
    id: 'doc-domicile',
    key: 'domicile_certificate',
    name_en: 'Domicile / Residence Certificate',
    name_hi: 'मूल निवास / अधिवास प्रमाण पत्र',
    description_en: 'Proof of permanent resident status in State / UT',
    description_hi: 'राज्य या केंद्र शासित प्रदेश में स्थायी निवास का कानूनी प्रमाण',
    category: 'address'
  },
  {
    id: 'doc-land',
    key: 'land_records',
    name_en: 'Land Ownership / Khasra-Khatauni',
    name_hi: 'भूमि अभिलेख (खसरा / खतौनी / भूलेख)',
    description_en: 'Registered agricultural landholding title and ownership records',
    description_hi: 'राजस्व विभाग में पंजीकृत कृषि भूमि स्वामित्व दस्तावेज़',
    category: 'land'
  },
  {
    id: 'doc-bank',
    key: 'bank_passbook',
    name_en: 'Bank Passbook / Aadhaar-Seeded Account',
    name_hi: 'बैंक पासबुक / आधार-सीडेड खाता विवरण',
    description_en: 'Bank account details with IFSC code & Aadhaar DBT active linking',
    description_hi: 'आईएफएससी कोड एवं आधार प्रत्यक्ष लाभ अंतरण (DBT) सक्रिय खाता',
    category: 'income'
  },
  {
    id: 'doc-edu',
    key: 'educational_certificates',
    name_en: 'Educational Certificates & Marksheets',
    name_hi: 'शैक्षणिक प्रमाण पत्र एवं अंकतालिका',
    description_en: 'Previous year qualifying marksheet or enrollment certificate',
    description_hi: 'पिछली कक्षा का उत्तीर्ण प्रमाण पत्र अथवा वर्तमान प्रवेश रसीद',
    category: 'education'
  },
  {
    id: 'doc-disability',
    key: 'disability_certificate',
    name_en: 'Disability Certificate (UDID Card)',
    name_hi: 'दिव्यांगता प्रमाण पत्र (यूडीआईडी कार्ड)',
    description_en: 'Unique Disability ID issued by competent medical board',
    description_hi: 'मेडिकल बोर्ड द्वारा जारी 40% या अधिक दिव्यांगता प्रमाण पत्र',
    category: 'other'
  },
  {
    id: 'doc-birth',
    key: 'birth_certificate',
    name_en: 'Birth Certificate',
    name_hi: 'जन्म प्रमाण पत्र',
    description_en: 'Municipal / Gram Panchayat official birth registration record',
    description_hi: 'नगर निगम या ग्राम पंचायत द्वारा जारी जन्म पंजीकरण प्रमाण',
    category: 'identity'
  },
  {
    id: 'doc-photo',
    key: 'passport_photos',
    name_en: 'Passport-size Photographs',
    name_hi: 'पासपोर्ट साइज रंगीन फोटोग्राफ',
    description_en: 'Recent passport photos with plain background',
    description_hi: 'सफेद पृष्ठभूमि वाली हालिया पासपोर्ट आकार की फोटो',
    category: 'identity'
  },
  {
    id: 'doc-scheme-form',
    key: 'scheme_application_form',
    name_en: 'Scheme-Specific Application Form',
    name_hi: 'योजना-विशिष्ट आवेदन प्रपत्र',
    description_en: 'Signed scheme declaration, undertaking or village sarpanch attestation',
    description_hi: 'हस्ताक्षरित घोषणा पत्र, शपथ पत्र अथवा ग्राम प्रधान सत्यापन',
    category: 'other'
  }
];

export const DEFAULT_PROFILE: CitizenProfile = {
  full_name: 'Priya Sharma',
  age: 28,
  dob: '1998-05-14',
  gender: 'female',
  state: 'Uttarakhand',
  district: 'Dehradun',
  residence_area: 'rural',
  marital_status: 'married',
  social_category: 'General',
  is_differently_abled: false,
  occupation: 'Farmer / Landholder',
  land_ownership: 'own',
  landholding_acres: 2.2,
  landholding_category: 'marginal',
  agricultural_activity: 'Wheat and Paddy cultivation',
  annual_family_income: 180000,
  personal_annual_income: 60000,
  annual_income_band: '1 - 2.5 Lakhs',
  is_bpl: false,
  has_income_certificate: true,
  education_level: 'Higher Secondary',
  documents: {
    aadhaar: 'available',
    pan_card: 'available',
    voter_id: 'available',
    ration_card: 'available',
    income_certificate: 'available',
    caste_certificate: 'not_applicable',
    domicile_certificate: 'available',
    land_records: 'available',
    bank_passbook: 'available',
    educational_certificates: 'available',
    disability_certificate: 'not_applicable',
    birth_certificate: 'available',
    passport_photos: 'available',
    scheme_application_form: 'missing'
  }
};

export const DEFAULT_SETTINGS: CitizenSettingsState = {
  theme: 'light',
  language: 'hi',
  email_reminders: true,
  in_app_notifications: true,
  deadline_alerts: true,
  missing_doc_reminders: true,
  follow_up_alerts: true,
  new_scheme_alerts: true,
  voice_assistant_enabled: true,
  voice_language: 'hi',
  voice_auto_speak: true,
  voice_speech_rate: 1.0,
  voice_interruption_enabled: true,
  font_size: 'normal',
  high_contrast: false,
  reduced_motion: false,
  email: 'priya.sharma@example.gov.in',
  consent_email_notifications: true
};

export const DEFAULT_APPLICATIONS: CitizenApplication[] = [
  {
    id: 'app-001',
    scheme_id: 'pm-kisan',
    scheme_name: 'PM-KISAN Samman Nidhi',
    category: 'Agriculture',
    status: 'Ready to Apply',
    applied_date: '2026-10-15',
    reference_number: 'PMK-UK-2026-98124',
    notes: 'Land records (khatauni) and bank account Aadhaar seeded.',
    important_dates: [
      { label: 'Next Installment Cycle', date: '2026-11-30' }
    ],
    next_action: 'Submit e-KYC on the PM-KISAN portal or visit nearest CSC.',
    reminder_date: '2026-11-20',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'app-002',
    scheme_id: 'pm-jay',
    scheme_name: 'Ayushman Bharat PM-JAY',
    category: 'Health',
    status: 'Approved',
    applied_date: '2026-08-20',
    reference_number: 'AB-UK-772918',
    notes: 'Ayushman Golden Card generated via Dehradun District Hospital.',
    important_dates: [
      { label: 'Annual Renewal', date: '2027-08-19' }
    ],
    next_action: 'Keep Golden Card digital copy in DigiLocker.',
    reminder_date: '2027-08-01',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

export const DEFAULT_REMINDERS: CitizenReminder[] = [
  {
    id: 'rem-001',
    title: 'PM-KISAN 19th Installment e-KYC Deadline',
    scheme_id: 'pm-kisan',
    scheme_name: 'PM-KISAN Samman Nidhi',
    description: 'Complete biometric or OTP-based e-KYC verification for installment release.',
    due_date: '2026-11-30',
    due_time: '18:00',
    channel: 'both',
    email: 'priya.sharma@example.gov.in',
    recipient_name: 'Priya Sharma',
    reminder_type: 'deadline',
    status: 'scheduled',
    delivery_message: 'In-app reminder scheduled. Email delivery active.',
    is_read: false,
    created_at: new Date().toISOString()
  },
  {
    id: 'rem-002',
    title: 'Collect Updated Land Khatauni from Tehsil',
    scheme_id: 'pm-kisan',
    scheme_name: 'PM-KISAN Samman Nidhi',
    description: 'Get verified computerised Khatauni copy for agricultural subsidy renewal.',
    due_date: '2026-11-15',
    due_time: '11:00',
    channel: 'in_app',
    recipient_name: 'Priya Sharma',
    reminder_type: 'document_collection',
    status: 'scheduled',
    delivery_message: 'In-app notification ready.',
    is_read: false,
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

export const DEFAULT_ACTIVITY: CitizenActivity[] = [
  {
    id: 'act-001',
    type: 'profile_updated',
    title_en: 'Profile Information Updated',
    title_hi: 'प्रोफ़ाइल जानकारी अपडेट की गई',
    description_en: 'Landholding category and income details synchronized.',
    description_hi: 'भूमि विवरण और आय वर्ग को अपडेट किया गया।',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    link: '/app/profile'
  },
  {
    id: 'act-002',
    type: 'eligibility_checked',
    title_en: 'Deterministic Eligibility Evaluated',
    title_hi: 'पात्रता नियम मूल्यांकन पूरा हुआ',
    description_en: 'Qualified for 5 central and state government schemes.',
    description_hi: '5 केंद्रीय और राज्य योजनाओं के लिए पात्र पाए गए।',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    link: '/app/recommendations'
  },
  {
    id: 'act-003',
    type: 'scheme_saved',
    title_en: 'Saved PM-KISAN Samman Nidhi',
    title_hi: 'पीएम-किसान सम्मान निधि को सहेजा गया',
    description_en: 'Scheme bookmarked for offline review.',
    description_hi: 'ऑफ़लाइन अध्ययन हेतु योजना सहेजी गई।',
    timestamp: new Date(Date.now() - 48 * 3600000).toISOString(),
    link: '/schemes/pm-kisan'
  }
];

/**
 * Meaningful Profile Completeness Calculation (0 - 100%)
 */
export function calculateProfileCompleteness(p: CitizenProfile): number {
  const fields = [
    Boolean(p.full_name?.trim()),
    Boolean(p.age && p.age > 0),
    Boolean(p.state?.trim()),
    Boolean(p.district?.trim()),
    Boolean(p.residence_area),
    Boolean(p.occupation?.trim()),
    Boolean(p.annual_income_band || p.annual_family_income),
    Boolean(p.education_level)
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

/**
 * Distinct Document Readiness Calculation (0 - 100%)
 */
export function calculateDocumentReadiness(docs: Record<string, DocumentStatus> = {}): {
  pct: number;
  available: number;
  missing: number;
  notApplicable: number;
  totalRequired: number;
} {
  const totalTracked = CORE_DOCUMENTS.length;
  let available = 0;
  let missing = 0;
  let notApplicable = 0;

  CORE_DOCUMENTS.forEach((doc) => {
    const st = docs[doc.key] || 'missing';
    if (st === 'available') available++;
    else if (st === 'not_applicable') notApplicable++;
    else missing++;
  });

  const totalRequired = totalTracked - notApplicable;
  const pct = totalRequired > 0 ? Math.round((available / totalRequired) * 100) : 100;

  return { pct, available, missing, notApplicable, totalRequired };
}

// Storage Keys
const PROFILE_KEY = 'yojana_citizen_profile';
const SETTINGS_KEY = 'yojana_citizen_settings';
const APPLICATIONS_KEY = 'yojana_citizen_applications';
const REMINDERS_KEY = 'yojana_citizen_reminders';
const ACTIVITY_KEY = 'yojana_citizen_activity';
const RECOMMENDATIONS_KEY = 'yojana_evaluation_results';

/**
 * Singleton In-Memory / Local Storage Store
 */
class CitizenStoreManager {
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('yojana_store_change'));
    }
  }

  // Profile
  public getProfile(): CitizenProfile {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        p.profile_completeness_pct = calculateProfileCompleteness(p);
        const docStats = calculateDocumentReadiness(p.documents);
        p.document_readiness_pct = docStats.pct;
        p.available_docs_count = docStats.available;
        p.missing_docs_count = docStats.missing;
        return p;
      }
    } catch {}
    const p = { ...DEFAULT_PROFILE };
    p.profile_completeness_pct = calculateProfileCompleteness(p);
    const docStats = calculateDocumentReadiness(p.documents);
    p.document_readiness_pct = docStats.pct;
    p.available_docs_count = docStats.available;
    p.missing_docs_count = docStats.missing;
    return p;
  }

  public saveProfile(updates: Partial<CitizenProfile>) {
    const current = this.getProfile();
    const updated: CitizenProfile = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString()
    };
    updated.profile_completeness_pct = calculateProfileCompleteness(updated);
    const docStats = calculateDocumentReadiness(updated.documents);
    updated.document_readiness_pct = docStats.pct;
    updated.available_docs_count = docStats.available;
    updated.missing_docs_count = docStats.missing;

    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
    localStorage.setItem('yojana_profile', JSON.stringify(updated)); // backward-compatibility

    // Persist to server-side CitizenProfile database
    fetch('http://127.0.0.1:8005/api/v1/citizen/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_identifier: 'citizen-default',
        full_name: updated.full_name,
        phone: updated.phone,
        email: updated.email,
        age: updated.age,
        gender: updated.gender,
        marital_status: updated.marital_status,
        caste_category: updated.caste_category,
        minority_status: updated.minority_status,
        is_differently_abled: updated.is_differently_abled,
        disability_percentage: updated.disability_percentage,
        state: updated.state === 'Uttarakhand' ? 'UK' : (updated.state === 'Uttar Pradesh' ? 'UP' : updated.state),
        district: updated.district,
        pincode: updated.pincode,
        area_type: updated.area_type,
        is_rural_resident: updated.is_rural_resident ?? (updated.area_type === 'rural'),
        annual_income: updated.annual_income || updated.annual_family_income || 96000,
        is_bpl: updated.is_bpl ?? (updated.bpl_status === 'yes'),
        ration_card_type: updated.ration_card_type,
        is_income_tax_payer: updated.is_income_tax_payer,
        employment_type: updated.employment_type,
        occupation: updated.occupation,
        is_unorganized_worker: updated.is_unorganized_worker,
        is_farmer: updated.is_farmer ?? (updated.occupation?.toLowerCase().includes('farm') || false),
        landholding_acres: updated.landholding_acres,
        highest_education: updated.highest_education || updated.education_level,
        is_student: updated.is_student,
        current_course: updated.current_course,
        has_aadhaar: updated.documents?.aadhaar === 'available',
        has_ration_card: updated.documents?.ration_card === 'available',
        has_land_records: updated.documents?.land_records === 'available',
        has_income_certificate: updated.documents?.income_certificate === 'available',
        has_caste_certificate: updated.documents?.caste_certificate === 'available',
        has_pucca_house: updated.has_pucca_house ?? false
      })
    }).catch(err => console.warn('Background sync to citizen API warning:', err));

    this.logActivity({
      type: 'profile_updated',
      title_en: 'Profile Information Saved',
      title_hi: 'प्रोफ़ाइल विवरण सहेजा गया',
      description_en: `Updated details for ${updated.full_name || 'Citizen'}. Completeness: ${updated.profile_completeness_pct}%`,
      description_hi: `${updated.full_name || 'नागरिक'} की प्रोफ़ाइल अपडेट हुई। पूर्णता: ${updated.profile_completeness_pct}%`,
      link: '/app/profile'
    });

    this.refreshEligibilityAndRecommendations(updated);
    this.notify();
  }

  public updateDocument(docKey: string, status: DocumentStatus) {
    const profile = this.getProfile();
    const docs = { ...(profile.documents || {}), [docKey]: status };
    const docMeta = CORE_DOCUMENTS.find(d => d.key === docKey);
    const docName = docMeta ? docMeta.name_en : docKey;
    const docNameHi = docMeta ? docMeta.name_hi : docKey;

    this.saveProfile({ documents: docs });

    this.logActivity({
      type: 'document_updated',
      title_en: `Document Checklist: ${docName}`,
      title_hi: `दस्तावेज़ सूची: ${docNameHi}`,
      description_en: `Status marked as '${status.toUpperCase()}'.`,
      description_hi: `स्थिति को '${status}' के रूप में चिह्नित किया गया।`,
      link: '/app/profile#documents'
    });
  }

  // Recommendations Auto-Refresh
  public async refreshEligibilityAndRecommendations(profile: CitizenProfile) {
    try {
      const resp = await fetch('http://127.0.0.1:8005/api/v1/eligibility/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            age: profile.age,
            state: profile.state === 'Uttarakhand' ? 'UK' : (profile.state === 'Uttar Pradesh' ? 'UP' : profile.state),
            district: profile.district,
            occupation: profile.occupation,
            annual_income: profile.annual_income || profile.annual_family_income || 96000,
            annual_income_band: profile.annual_income_band,
            gender: profile.gender,
            is_bpl: profile.is_bpl ?? (profile.bpl_status === 'yes'),
            is_income_tax_payer: profile.is_income_tax_payer ?? false,
            is_farmer: profile.is_farmer ?? (profile.occupation?.toLowerCase().includes('farm') || false),
            owns_cultivable_land: profile.owns_cultivable_land ?? (Number(profile.landholding_acres || 0) > 0),
            has_aadhaar: profile.documents?.aadhaar === 'available',
            ekyc_completed: true,
            has_pucca_house: profile.has_pucca_house ?? false,
            is_rural_resident: profile.is_rural_resident ?? (profile.area_type === 'rural'),
            social_category: profile.social_category,
            is_differently_abled: profile.is_differently_abled,
            land_ownership: profile.land_ownership,
            landholding_acres: profile.landholding_acres,
            education_level: profile.education_level
          }
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.data) {
          localStorage.setItem(RECOMMENDATIONS_KEY, JSON.stringify(json.data));
          this.notify();
        }
      }
    } catch (e) {
      console.warn('Auto recommendation refresh warning:', e);
    }
  }

  // Applications Tracker
  public getApplications(): CitizenApplication[] {
    try {
      const raw = localStorage.getItem(APPLICATIONS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_APPLICATIONS;
  }

  public addApplication(app: Omit<CitizenApplication, 'id' | 'created_at' | 'updated_at'>) {
    const list = this.getApplications();
    const newApp: CitizenApplication = {
      ...app,
      id: `app-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.unshift(newApp);
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(list));

    this.logActivity({
      type: 'application_added',
      title_en: `Started Tracking: ${newApp.scheme_name}`,
      title_hi: `आवेदन ट्रैकिंग शुरू: ${newApp.scheme_name}`,
      description_en: `Status: ${newApp.status}. Reference: ${newApp.reference_number || 'N/A'}.`,
      description_hi: `स्थिति: ${newApp.status}. संदर्भ: ${newApp.reference_number || 'उपलब्ध नहीं'}`,
      link: '/app'
    });

    this.notify();
  }

  public updateApplication(appId: string, updates: Partial<CitizenApplication>) {
    const list = this.getApplications();
    const idx = list.findIndex(a => a.id === appId);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        ...updates,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(list));

      this.logActivity({
        type: 'application_status_updated',
        title_en: `Application Status: ${list[idx].scheme_name}`,
        title_hi: `आवेदन स्थिति अपडेट: ${list[idx].scheme_name}`,
        description_en: `Updated to ${list[idx].status}.`,
        description_hi: `नई स्थिति: ${list[idx].status}।`,
        link: '/app'
      });

      this.notify();
    }
  }

  public deleteApplication(appId: string) {
    const list = this.getApplications().filter(a => a.id !== appId);
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(list));
    this.notify();
  }

  // Reminders & Notification Centre
  public getReminders(): CitizenReminder[] {
    try {
      const raw = localStorage.getItem(REMINDERS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_REMINDERS;
  }

  public async createReminder(rem: Omit<CitizenReminder, 'id' | 'created_at' | 'status' | 'is_read'>) {
    const list = this.getReminders();
    const newRem: CitizenReminder = {
      ...rem,
      id: `rem-${Date.now()}`,
      status: 'scheduled',
      is_read: false,
      created_at: new Date().toISOString()
    };

    // Attempt backend sync & email delivery
    try {
      const resp = await fetch('http://127.0.0.1:8005/api/v1/reminders/citizen/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRem.title,
          scheme_id: newRem.scheme_id,
          scheme_name: newRem.scheme_name,
          description: newRem.description,
          due_date: newRem.due_date,
          due_time: newRem.due_time || '10:00',
          channel: newRem.channel,
          email: newRem.email,
          recipient_name: newRem.recipient_name,
          reminder_type: newRem.reminder_type,
          language: this.getSettings().language
        })
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.data) {
          newRem.status = json.data.status;
          newRem.delivery_message = json.data.delivery_message;
        }
      }
    } catch (e) {
      console.warn('Backend reminder sync warning:', e);
    }

    list.unshift(newRem);
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));

    this.logActivity({
      type: 'reminder_created',
      title_en: `Reminder Created: ${newRem.title}`,
      title_hi: `अनुस्मारक सेट किया गया: ${newRem.title}`,
      description_en: `Scheduled for ${newRem.due_date} at ${newRem.due_time || '10:00'}. Channel: ${newRem.channel}`,
      description_hi: `दिनांक: ${newRem.due_date}, समय: ${newRem.due_time || '10:00'}। माध्यम: ${newRem.channel}`,
      link: '/app'
    });

    this.notify();
  }

  public markReminderRead(remId: string) {
    const list = this.getReminders();
    const idx = list.findIndex(r => r.id === remId);
    if (idx !== -1) {
      list[idx].is_read = true;
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
      this.notify();
    }
  }

  public deleteReminder(remId: string) {
    const list = this.getReminders().filter(r => r.id !== remId);
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(list));
    this.notify();
  }

  // Activity Log
  public getActivity(): CitizenActivity[] {
    try {
      const raw = localStorage.getItem(ACTIVITY_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_ACTIVITY;
  }

  public logActivity(item: Omit<CitizenActivity, 'id' | 'timestamp'>) {
    const list = this.getActivity();
    const newAct: CitizenActivity = {
      ...item,
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    list.unshift(newAct);
    // Keep last 40 items
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(list.slice(0, 40)));
  }

  // Settings
  public getSettings(): CitizenSettingsState {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_SETTINGS;
  }

  public saveSettings(updates: Partial<CitizenSettingsState>) {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));

    if (updated.theme) {
      document.documentElement.setAttribute('data-theme', updated.theme);
      localStorage.setItem('yojana_theme', updated.theme);
    }
    if (updated.language) {
      localStorage.setItem('yojana_language', updated.language);
    }

    this.notify();
  }

  // Reset & Export
  public exportData(): string {
    const data = {
      profile: this.getProfile(),
      applications: this.getApplications(),
      reminders: this.getReminders(),
      activity: this.getActivity(),
      settings: this.getSettings(),
      exported_at: new Date().toISOString(),
      platform: 'Yojana Sahayak'
    };
    this.saveSettings({ last_exported_at: new Date().toISOString() });
    return JSON.stringify(data, null, 2);
  }

  public resetAllData() {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem('yojana_profile');
    localStorage.removeItem(APPLICATIONS_KEY);
    localStorage.removeItem(REMINDERS_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
    localStorage.removeItem(RECOMMENDATIONS_KEY);
    localStorage.removeItem('yojana_saved');
    localStorage.removeItem('yojana_saved_items');
    this.notify();
  }
}

export const citizenStore = new CitizenStoreManager();

/**
 * Reactive React Hook for Citizen App Components
 */
export function useCitizenStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = citizenStore.subscribe(() => setTick(t => t + 1));
    const handleStorage = () => setTick(t => t + 1);
    window.addEventListener('yojana_store_change', handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener('yojana_store_change', handleStorage);
    };
  }, []);

  const profile = citizenStore.getProfile();
  const applications = citizenStore.getApplications();
  const reminders = citizenStore.getReminders();
  const activity = citizenStore.getActivity();
  const settings = citizenStore.getSettings();

  // Metrics
  const stats = {
    profileCompleteness: profile.profile_completeness_pct || 0,
    documentReadiness: profile.document_readiness_pct || 0,
    availableDocsCount: profile.available_docs_count || 0,
    missingDocsCount: profile.missing_docs_count || 0,
    totalApplications: applications.length,
    pendingApplications: applications.filter(a => ['Interested', 'Preparing Documents', 'Ready to Apply', 'Submitted', 'Under Review'].includes(a.status)).length,
    approvedApplications: applications.filter(a => a.status === 'Approved').length,
    upcomingReminders: reminders.filter(r => !r.is_read).length,
    unreadNotifications: reminders.filter(r => !r.is_read).length
  };

  return {
    profile,
    applications,
    reminders,
    activity,
    settings,
    stats,
    saveProfile: citizenStore.saveProfile.bind(citizenStore),
    updateDocument: citizenStore.updateDocument.bind(citizenStore),
    addApplication: citizenStore.addApplication.bind(citizenStore),
    updateApplication: citizenStore.updateApplication.bind(citizenStore),
    deleteApplication: citizenStore.deleteApplication.bind(citizenStore),
    createReminder: citizenStore.createReminder.bind(citizenStore),
    markReminderRead: citizenStore.markReminderRead.bind(citizenStore),
    deleteReminder: citizenStore.deleteReminder.bind(citizenStore),
    saveSettings: citizenStore.saveSettings.bind(citizenStore),
    exportData: citizenStore.exportData.bind(citizenStore),
    resetAllData: citizenStore.resetAllData.bind(citizenStore)
  };
}

