/**
 * Data contracts and UI types for Yojana Sahayak frontend.
 */

export type Language = 'hi' | 'en';
export type Theme = 'light' | 'dark' | 'system';

export interface SchemeItem {
  scheme_id: string;
  code: string;
  name_en: string;
  name_hi: string;
  short_name?: string;
  level: string;
  state?: string | null;
  ministry_or_dept?: string;
  category: string;
  description_en: string;
  description_hi: string;
  initial_mode: string;
  rule_scope: string;
  rag_enabled: boolean;
  rules_enabled: boolean;
  official_portal_url?: string;
  benefits_summary_en?: string;
  benefits_summary_hi?: string;
  objectives?: string;
  beneficiaries?: string;
  eligibility_criteria?: string;
  age_criteria?: string;
  income_criteria?: string;
  required_documents?: string[];
  application_process?: string;
  application_mode?: string;
  exclusions?: string;
  relevant_pages?: number[];
  guideline_title?: string;
  pdf_filename?: string;
  document_count?: number;
  verified_documents?: VerifiedDocumentItem[];
  active_rules?: ActiveRuleItem[];
}

export interface VerifiedDocumentItem {
  document_id: string;
  title: string;
  document_type: string;
  issuer?: string;
  jurisdiction?: string;
  version_id: string;
  version_number: number;
  storage_key: string;
  content_type: string;
  binary_sha256: string;
  total_pages: number;
  relevant_pages?: number[];
  pdf_url: string;
  first_page_image_url?: string;
  is_primary?: boolean;
}

export interface ActiveRuleItem {
  id: string;
  rule_code: string;
  version: number;
  logic_expression: string;
  evidence_quote: string;
  page_reference: number;
  document_version_id?: string;
}

export interface SourceRecord {
  source_id: string;
  name: string;
  base_url: string;
  source_family: string;
  jurisdiction: string;
  language_hints?: string[];
  source_role?: string;
  adapter_key: string;
  fetch_mode?: string;
  allowed_content_types?: string[];
  permission_status: string;
  automation_status: string;
  written_authorization_reference?: string;
  robots_checked_at?: string;
  terms_checked_at?: string;
  can_run_automatically?: boolean;
  compliance_block_reason?: string;
  notes?: string;
  schedule_cron: string;
  enabled: boolean;
  last_success_at?: string;
  last_error_at?: string;
  last_error_code?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  evidence_badge?: 'STRONG' | 'PARTIAL' | 'INSUFFICIENT';
  evidence_reason?: string;
  is_refusal?: boolean;
  citations?: CitationReference[];
  timestamp: string;
  passages_retrieved?: number;
}

export interface CitationReference {
  citation_tag?: string;
  index?: number;
  chunk_id: string;
  document_version_id: string;
  page_number: number;
  document_title: string;
  quote?: string;
  quote_snippet?: string;
  boxes?: Array<{
    page_number?: number;
    x0?: number;
    y0?: number;
    x1?: number;
    y1?: number;
    box_type?: string;
  }>;
}

export interface QuestionnaireAnswer {
  question_id: string;
  value: string | number | boolean;
  status: 'answered' | 'not_sure' | 'skipped';
}

export type DocumentStatus = 'available' | 'missing' | 'not_applicable' | 'not_sure';

export interface DocumentItemInfo {
  id: string;
  key: string;
  name_en: string;
  name_hi: string;
  description_en: string;
  description_hi: string;
  category: 'identity' | 'income' | 'address' | 'land' | 'education' | 'other';
  status: DocumentStatus;
  updated_at?: string;
}

export interface CitizenProfile {
  // Personal Information
  full_name?: string;
  age?: number;
  dob?: string;
  gender?: 'male' | 'female' | 'transgender' | 'prefer_not_to_say' | string;
  state?: string;
  district?: string;
  residence_area?: 'rural' | 'urban' | 'semi_urban' | string;
  marital_status?: 'single' | 'married' | 'widowed' | 'divorced' | string;
  social_category?: 'General' | 'OBC' | 'SC' | 'ST' | 'EWS' | string;
  is_differently_abled?: boolean;
  disability_percentage?: number;

  // Occupation & Employment
  occupation?: string;
  land_ownership?: 'own' | 'tenant' | 'sharecropper' | 'none' | string;
  landholding_acres?: number;
  landholding_category?: 'marginal' | 'small' | 'medium' | 'large' | string;
  agricultural_activity?: string;
  current_education_level?: string;
  institution_type?: 'government' | 'private_aided' | 'private_unaided' | string;
  course_name?: string;
  employment_type?: 'permanent' | 'contract' | 'temporary' | string;
  income_category?: string;

  // Financial Information
  annual_family_income?: number;
  personal_annual_income?: number;
  annual_income_band?: string;
  is_bpl?: boolean;
  has_income_certificate?: boolean;

  // Education Information
  education_level?: string;

  // Documents Checklist (My Documents)
  documents?: Record<string, DocumentStatus>;

  // Additional 7-Category Extended Attributes
  phone?: string;
  email?: string;
  caste_category?: string;
  minority_status?: boolean;
  pincode?: string;
  area_type?: string;
  is_rural_resident?: boolean;
  annual_income?: number;
  bpl_status?: string;
  ration_card_type?: string;
  is_income_tax_payer?: boolean;
  is_unorganized_worker?: boolean;
  is_farmer?: boolean;
  owns_cultivable_land?: boolean;
  highest_education?: string;
  is_student?: boolean;
  current_course?: string;
  has_pucca_house?: boolean;
  ekyc_completed?: boolean;

  // Calculated Metrics
  profile_completeness_pct?: number;
  document_readiness_pct?: number;
  available_docs_count?: number;
  missing_docs_count?: number;
  updated_at?: string;
}

export type ApplicationStatus =
  | 'Interested'
  | 'Preparing Documents'
  | 'Ready to Apply'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Action Required';

export interface CitizenApplication {
  id: string;
  scheme_id: string;
  scheme_name: string;
  category?: string;
  status: ApplicationStatus;
  applied_date?: string;
  reference_number?: string;
  notes?: string;
  important_dates?: Array<{ label: string; date: string }>;
  next_action?: string;
  reminder_date?: string;
  created_at: string;
  updated_at: string;
}

export type ReminderType =
  | 'deadline'
  | 'document_collection'
  | 'submission'
  | 'follow_up'
  | 'general';

export interface CitizenReminder {
  id: string;
  title: string;
  scheme_id?: string;
  scheme_name?: string;
  description?: string;
  due_date: string;
  due_time?: string;
  channel: 'in_app' | 'email' | 'both';
  email?: string;
  recipient_name?: string;
  reminder_type: ReminderType;
  status: 'scheduled' | 'delivered' | 'pending_configuration' | 'failed' | 'cancelled';
  delivery_message?: string;
  is_read: boolean;
  created_at: string;
}

export interface CitizenActivity {
  id: string;
  type:
    | 'profile_updated'
    | 'scheme_saved'
    | 'scheme_unsaved'
    | 'eligibility_checked'
    | 'application_added'
    | 'application_status_updated'
    | 'reminder_created'
    | 'document_updated';
  title_en: string;
  title_hi: string;
  description_en: string;
  description_hi: string;
  timestamp: string;
  link?: string;
}

export interface CitizenSettingsState {
  theme: 'light' | 'dark' | 'system';
  language: 'hi' | 'en';
  email_reminders: boolean;
  in_app_notifications: boolean;
  deadline_alerts: boolean;
  missing_doc_reminders: boolean;
  follow_up_alerts: boolean;
  new_scheme_alerts: boolean;
  voice_assistant_enabled: boolean;
  voice_language: 'hi' | 'en' | 'auto';
  voice_auto_speak: boolean;
  voice_speech_rate: number;
  voice_interruption_enabled: boolean;
  font_size: 'normal' | 'large' | 'extra_large';
  high_contrast: boolean;
  reduced_motion: boolean;
  email: string;
  consent_email_notifications: boolean;
  last_exported_at?: string;
}

export interface EligibilityResult {
  scheme_id: string;
  scheme_name: string;
  status: 'Eligible' | 'Likely Eligible' | 'Need More Information' | 'Not Eligible';
  matched_rules: string[];
  unmet_rules: string[];
  missing_information: string[];
  reason: string;
}

export interface RankedSchemeRecommendation {
  rank: number;
  score: number;
  tier: 'Eligible' | 'Likely Eligible' | 'Need More Information' | 'Not Eligible';
  confidence_mode: string;
  completeness_ratio: number;
  score_breakdown: {
    tier_base: number;
    confidence_weight: number;
    completeness: number;
    verification_status: number;
    recency: number;
  };
  evaluation: {
    scheme_id: string;
    scheme_name_en: string;
    scheme_name_hi: string;
    outcome: 'Eligible' | 'Likely Eligible' | 'Need More Information' | 'Not Eligible';
    active_rules_evaluated: number;
    rules_matched: Array<{
      rule_id: string;
      rule_code: string;
      state: string;
      evidence_quote: string;
      page_reference: number;
      matched_criteria: string[];
      requires_official_verification: boolean;
    }>;
    rules_unmet: Array<{
      rule_id: string;
      rule_code: string;
      state: string;
      evidence_quote: string;
      page_reference: number;
      unmet_criteria: string[];
      is_disqualified_by_exception: boolean;
    }>;
    missing_fields: string[];
    ignored_unverified_rules: string[];
    reasons_en: string[];
    reasons_hi: string[];
    requires_official_verification: boolean;
  };
}

export interface DiscoveryJob {
  id: string;
  source_id: string;
  trigger_type: 'scheduled' | 'manual';
  status: 'queued' | 'running' | 'completed' | 'completed_with_warnings' | 'failed';
  pages_discovered: number;
  pages_fetched: number;
  candidates_created: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface ResourceCandidate {
  id: string;
  source_id: string;
  source_name?: string;
  run_id?: string;
  canonical_url: string;
  original_url: string;
  content_type: string;
  binary_sha256: string;
  normalized_text_sha256?: string;
  title?: string;
  issuer?: string;
  detected_date?: string;
  classification: 'new_resource' | 'changed_binary' | 'changed_content' | 'duplicate' | string;
  review_status: 'pending_review' | 'approved' | 'rejected' | 'duplicate' | string;
  review_notes?: string;
  assigned_scheme_id?: string;
  created_at?: string;
  reviewed_at?: string;
}

export interface AuditRecord {
  id: string;
  actor: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details?: Record<string, any>;
  created_at: string;
}
