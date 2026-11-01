/**
 * Yojana Sahayak — Complete 7-Category Progressive Eligibility Questionnaire
 *
 * Implements Priority 1 & GovTech Blueprint:
 * 1. 7 Progressive Categories:
 *    - Step 1: Personal Information
 *    - Step 2: Residential Information
 *    - Step 3: Financial Information
 *    - Step 4: Employment & Occupation
 *    - Step 5: Agricultural Information
 *    - Step 6: Education & Academics
 *    - Step 7: Documents & Identification
 *    - Step 8: Review & Edit Summary
 * 2. Visual Stepper UX with step indicator, progress %, and direct jump.
 * 3. Conditional field visibility (farmer, disability, student).
 * 4. Skip / "Not sure right now" (Kleene 3-valued UNKNOWN logic).
 * 5. Server-Side Persistence: Prefills from database, Save & Resume anywhere,
 *    and deterministic server-side evaluation with 4-tier output.
 * 6. Full Dark Mode & Bilingual Hindi/English Localization.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Home,
  Landmark,
  Briefcase,
  Sprout,
  GraduationCap,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Info,
  Edit3,
  Check,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './EligibilityQuestionnairePage.css';

interface CategoryMeta {
  id: string;
  step: number;
  title_en: string;
  title_hi: string;
  desc_en: string;
  desc_hi: string;
  icon: React.ElementType;
}

interface QuestionItem {
  id: string;
  field: string;
  category: string;
  type: 'boolean' | 'number' | 'select' | 'text';
  label_en: string;
  label_hi: string;
  placeholder_en?: string;
  placeholder_hi?: string;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label_en: string; label_hi: string }>;
  required?: boolean;
  official_verification_required?: boolean;
  tooltip_en?: string;
  tooltip_hi?: string;
  depends_on?: { field: string; value: any };
}

const CATEGORY_DEFINITIONS: CategoryMeta[] = [
  {
    id: 'personal',
    step: 1,
    title_en: 'Personal Information',
    title_hi: 'व्यक्तिगत जानकारी',
    desc_en: 'Age, gender, social category and personal profile attributes.',
    desc_hi: 'आयु, लिंग, सामाजिक श्रेणी और व्यक्तिगत विवरण।',
    icon: User
  },
  {
    id: 'residential',
    step: 2,
    title_en: 'Residential Information',
    title_hi: 'निवास संबंधी जानकारी',
    desc_en: 'Permanent state domicile, district, and rural/urban classification.',
    desc_hi: 'स्थायी निवास राज्य, जिला एवं ग्रामीण/शहरी क्षेत्र।',
    icon: Home
  },
  {
    id: 'financial',
    step: 3,
    title_en: 'Financial Information',
    title_hi: 'वित्तीय जानकारी',
    desc_en: 'Annual family income, BPL status, and tax payer declarations.',
    desc_hi: 'पारिवारिक वार्षिक आय, बीपीएल राशन कार्ड और आयकर स्थिति।',
    icon: Landmark
  },
  {
    id: 'employment',
    step: 4,
    title_en: 'Employment & Occupation',
    title_hi: 'रोजगार और व्यवसाय',
    desc_en: 'Work category, primary trade, and unorganized labor status.',
    desc_hi: 'रोजगार का प्रकार, प्रमुख पेशा और असंगठित श्रमिक स्थिति।',
    icon: Briefcase
  },
  {
    id: 'agricultural',
    step: 5,
    title_en: 'Agricultural Information',
    title_hi: 'कृषि संबंधी जानकारी',
    desc_en: 'Cultivable farmland ownership, landholding size, and land tenure.',
    desc_hi: 'कृषि भूमि स्वामित्व, जोत का आकार और काश्तकारी प्रकार।',
    icon: Sprout
  },
  {
    id: 'education',
    step: 6,
    title_en: 'Education & Academics',
    title_hi: 'शिक्षा और अकादमिक जानकारी',
    desc_en: 'Highest qualification, student enrollment, and board percentiles.',
    desc_hi: 'उच्चतम शैक्षणिक योग्यता, वर्तमान नामांकन और मेरिट प्रतिशत।',
    icon: GraduationCap
  },
  {
    id: 'documents',
    step: 7,
    title_en: 'Documents & Identification',
    title_hi: 'दस्तावेज और पहचान',
    desc_en: 'Aadhaar DBT linking, Jan Dhan account, and certified documents.',
    desc_hi: 'आधार डीबीटी लिंकिंग, जन धन खाता और प्रमाणित दस्तावेज।',
    icon: FileCheck2
  }
];

export const EligibilityQuestionnairePage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isHindi = language === 'hi';

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Load questions schema & prefill answers from database
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Question Catalog
        const qResp = await fetch('/api/v1/eligibility/questions');
        if (qResp.ok) {
          const qJson = await qResp.json();
          setQuestions(qJson.data.questions || []);
        }

        // 2. Load In-Progress or Existing Profile Data from Server
        const loadResp = await fetch('/api/v1/citizen/assessment/load');
        if (loadResp.ok) {
          const loadJson = await loadResp.json();
          const savedAnswers = loadJson.data.answers || {};
          setAnswers(savedAnswers);
          if (loadJson.data.current_step && loadJson.data.current_step >= 1 && loadJson.data.current_step <= 7) {
            setCurrentStep(loadJson.data.current_step);
          }
        }
      } catch (err) {
        console.error('Failed to load questionnaire data from backend:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Filter current category questions and conditional visibility
  const currentCategory = CATEGORY_DEFINITIONS[currentStep - 1];

  const visibleCategoryQuestions = useMemo(() => {
    if (!currentCategory) return [];
    return questions.filter(q => {
      if (q.category !== currentCategory.id) return false;
      if (!q.depends_on) return true;
      return answers[q.depends_on.field] === q.depends_on.value;
    });
  }, [questions, currentCategory, answers]);

  // Overall progress percentage across all 7 categories
  const progressPercent = Math.min(100, Math.round(((currentStep - 1) / 7) * 100));

  // Handle single question input change
  const handleInputChange = (field: string, value: any) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  // Handle Skip / "Not sure right now"
  const handleNotSure = (field: string) => {
    setAnswers(prev => ({ ...prev, [field]: 'not_sure' }));
  };

  // Server-side Save & Resume
  const handleSaveProgress = async () => {
    setIsSaving(true);
    setSaveToast(null);
    try {
      const resp = await fetch('/api/v1/citizen/assessment/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_identifier: 'citizen-default',
          current_step: currentStep,
          answers: answers
        })
      });

      if (resp.ok) {
        setSaveToast(isHindi ? 'प्रगति सर्वर डेटाबेस में सुरक्षित सहेजी गई!' : 'Progress successfully saved to database!');
        setTimeout(() => setSaveToast(null), 4000);
      } else {
        setSaveToast(isHindi ? 'सहेजने में त्रुटि आई।' : 'Failed to save progress.');
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveToast(isHindi ? 'सहेजने में नेटवर्क त्रुटि।' : 'Network error while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Step Navigation Handlers
  const handleNextStep = () => {
    if (currentStep < 8) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Final Evaluation Submission to Server
  const handleSubmitAssessment = async () => {
    setIsSubmitting(true);
    try {
      const resp = await fetch('/api/v1/citizen/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_identifier: 'citizen-default',
          answers: answers
        })
      });

      if (resp.ok) {
        const json = await resp.json();
        // Cache evaluation results locally for instant access and navigate
        localStorage.setItem('yojana_evaluation_results', JSON.stringify(json.data));
        navigate('/app/recommendations');
      } else {
        alert(isHindi ? 'मूल्यांकन सेवा में त्रुटि आई। कृपया पुनः प्रयास करें।' : 'Evaluation service error. Please try again.');
      }
    } catch (err) {
      console.error('Assessment submit error:', err);
      alert(isHindi ? 'नेटवर्क त्रुटि: मूल्यांकन सर्वर से कनेक्ट नहीं हो सका।' : 'Network error connecting to evaluation service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="eq-loading-container">
        <div className="eq-spinner" />
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
          {isHindi ? '7-चरणीय सत्यापित पात्रता प्रश्नावली लोड हो रही है...' : 'Loading 7-Step Verified Eligibility Questionnaire...'}
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
          {isHindi ? 'सर्वर से आधिकारिक प्रश्न और पूर्व-भरी प्रोफाइल सिंक्रनाइज़ की जा रही है...' : 'Syncing official schema & existing citizen profile from database...'}
        </p>
      </div>
    );
  }

  return (
    <div className="eq-page-container">
      <div className="eq-page-inner">

        {/* ------------------------------------------------------------- */}
        {/* HEADER & SAVED STATUS BANNER */}
        {/* ------------------------------------------------------------- */}
        <div className="eq-card eq-header-card">
          <div>
            <div className="eq-badge-row">
              <span className="eq-badge eq-badge-emerald">
                {isHindi ? 'प्राधिकृत पात्रता इंजन V2' : 'Deterministic Rules Engine V2'}
              </span>
              <span className="eq-badge eq-badge-amber">
                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                {isHindi ? '100% सटीक कानूनी नियम' : '100% Deterministic Kleene Logic'}
              </span>
            </div>
            <h1 className="eq-header-title">
              {isHindi ? 'सरकारी योजना पात्रता निर्धारण' : 'Government Scheme Eligibility Assessment'}
            </h1>
            <p className="eq-header-desc">
              {isHindi
                ? '7 चरणों में अपने विवरण दर्ज करें। हमारा सिस्टम बिना किसी पूर्वाग्रह के आपकी सटीक पात्रता जांचेगा।'
                : 'Complete 7 progressive categories to receive fully verified, ranked welfare recommendations.'}
            </p>
          </div>

          <div style={{ alignSelf: 'flex-start' }}>
            <button
              type="button"
              onClick={handleSaveProgress}
              disabled={isSaving}
              className="eq-btn-save"
            >
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {isHindi ? 'सहेजें व बाद में करें' : 'Save & Resume'}
            </button>
          </div>

          {/* Toast Notification */}
          {saveToast && (
            <div className="eq-toast" style={{ width: '100%' }}>
              <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
              <span>{saveToast}</span>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* PROGRESS STEPPER BAR */}
        {/* ------------------------------------------------------------- */}
        <div className="eq-card">
          <div className="eq-stepper-header">
            <span className="eq-step-tag">
              {currentStep <= 7 ? (
                <>
                  {isHindi ? `चरण ${currentStep} / 7: ${currentCategory?.title_hi}` : `Step ${currentStep} of 7: ${currentCategory?.title_en}`}
                </>
              ) : (
                <>
                  {isHindi ? 'चरण 8 / 8: अंतिम समीक्षा और संपादन' : 'Step 8 of 8: Final Review & Submission'}
                </>
              )}
            </span>
            <span className="eq-progress-pct">
              {currentStep === 8 ? '100%' : `${progressPercent}%`} {isHindi ? 'पूर्ण' : 'Completed'}
            </span>
          </div>

          {/* Progress Bar Line */}
          <div className="eq-progress-track">
            <div
              className="eq-progress-fill"
              style={{ width: `${currentStep === 8 ? 100 : progressPercent}%` }}
            />
          </div>

          {/* Stepper Navigation Pills */}
          <div className="eq-stepper-grid">
            {CATEGORY_DEFINITIONS.map(cat => {
              const IconComp = cat.icon;
              const isPast = currentStep > cat.step;
              const isCurrent = currentStep === cat.step;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCurrentStep(cat.step)}
                  className={`eq-step-pill ${
                    isCurrent ? 'active' : isPast ? 'completed' : ''
                  }`}
                >
                  <div className="eq-step-pill-icon-box">
                    <IconComp size={18} />
                    {isPast && (
                      <span className="eq-step-check-badge">
                        <Check size={9} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <span className="eq-step-label">
                    {isHindi ? cat.title_hi.split(' ')[0] : cat.title_en.split(' ')[0]}
                  </span>
                </button>
              );
            })}

            {/* Step 8: Review Pill */}
            <button
              type="button"
              onClick={() => setCurrentStep(8)}
              className={`eq-step-pill ${currentStep === 8 ? 'active' : ''}`}
            >
              <div className="eq-step-pill-icon-box">
                <CheckCircle2 size={18} />
              </div>
              <span className="eq-step-label">
                {isHindi ? 'समीक्षा' : 'Review'}
              </span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* STEP CONTENT: CATEGORIES 1 TO 7 */}
        {/* ------------------------------------------------------------- */}
        {currentStep <= 7 && currentCategory && (
          <div className="eq-card">
            <div className="eq-category-header">
              <div className="eq-category-icon-box">
                {React.createElement(currentCategory.icon, { size: 24 })}
              </div>
              <div>
                <h2 className="eq-category-title">
                  {isHindi ? currentCategory.title_hi : currentCategory.title_en}
                </h2>
                <p className="eq-category-desc">
                  {isHindi ? currentCategory.desc_hi : currentCategory.desc_en}
                </p>
              </div>
            </div>

            {/* Questions Grid */}
            <div className="eq-questions-list">
              {visibleCategoryQuestions.map(q => {
                const currentValue = answers[q.field];
                const isNotSure = currentValue === 'not_sure';

                return (
                  <div key={q.id} className="eq-question-card">
                    {/* Question Header & Tooltip */}
                    <div className="eq-question-header">
                      <div>
                        <div className="eq-question-label">
                          <span>{isHindi ? q.label_hi : q.label_en}</span>
                          {q.required && (
                            <span className="eq-req-star" title="Mandatory field">*</span>
                          )}
                          {q.official_verification_required && (
                            <span className="eq-badge eq-badge-amber">
                              {isHindi ? 'सरकारी सत्यापन' : 'Official Verification'}
                            </span>
                          )}
                        </div>
                        {q.tooltip_en && (
                          <p className="eq-tooltip-text">
                            <Info size={13} style={{ flexShrink: 0 }} />
                            <span>{isHindi ? q.tooltip_hi : q.tooltip_en}</span>
                          </p>
                        )}
                      </div>

                      {/* Not Sure Button */}
                      {!q.required && (
                        <button
                          type="button"
                          onClick={() => handleNotSure(q.field)}
                          className={`eq-btn-not-sure ${isNotSure ? 'active' : ''}`}
                        >
                          {isHindi ? 'अभी निश्चित नहीं' : 'Not sure'}
                        </button>
                      )}
                    </div>

                    {/* Question Control: Boolean */}
                    {q.type === 'boolean' && (
                      <div className="eq-bool-group">
                        <button
                          type="button"
                          onClick={() => handleInputChange(q.field, true)}
                          className={`eq-bool-btn ${currentValue === true ? 'selected-yes' : ''}`}
                        >
                          {currentValue === true && <Check size={16} />}
                          <span>{isHindi ? 'हाँ (Yes)' : 'Yes'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange(q.field, false)}
                          className={`eq-bool-btn ${currentValue === false ? 'selected-no' : ''}`}
                        >
                          {currentValue === false && <Check size={16} />}
                          <span>{isHindi ? 'नहीं (No)' : 'No'}</span>
                        </button>
                      </div>
                    )}

                    {/* Question Control: Number */}
                    {q.type === 'number' && (
                      <div style={{ paddingTop: '4px' }}>
                        <input
                          type="number"
                          min={q.min ?? 0}
                          max={q.max}
                          value={currentValue !== undefined && currentValue !== 'not_sure' ? currentValue : ''}
                          onChange={e => handleInputChange(q.field, e.target.value === '' ? null : Number(e.target.value))}
                          placeholder={isHindi ? q.placeholder_hi : q.placeholder_en}
                          className="eq-input"
                        />
                      </div>
                    )}

                    {/* Question Control: Select */}
                    {q.type === 'select' && q.options && (
                      <div style={{ paddingTop: '4px' }}>
                        <select
                          value={currentValue !== undefined && currentValue !== 'not_sure' ? currentValue : ''}
                          onChange={e => handleInputChange(q.field, e.target.value || null)}
                          className="eq-select"
                        >
                          <option value="">{isHindi ? '-- कृपया विकल्प चुनें --' : '-- Select an option --'}</option>
                          {q.options.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {isHindi ? opt.label_hi : opt.label_en}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Question Control: Text */}
                    {q.type === 'text' && (
                      <div style={{ paddingTop: '4px' }}>
                        <input
                          type="text"
                          value={currentValue !== undefined && currentValue !== 'not_sure' ? currentValue : ''}
                          onChange={e => handleInputChange(q.field, e.target.value || null)}
                          placeholder={isHindi ? q.placeholder_hi : q.placeholder_en}
                          className="eq-input"
                        />
                      </div>
                    )}

                    {isNotSure && (
                      <div className="eq-not-sure-notice">
                        {isHindi
                          ? 'आपने "निश्चित नहीं" चुना है। नियम मूल्यांकनकर्ता इस मानदंड को UNKNOWN मानेगा और आवश्यकता पड़ने पर स्पष्टीकरण मांगेगा।'
                          : 'Marked as "Not Sure". Evaluator will evaluate this condition using Kleene UNKNOWN logic without hard rejection.'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stepper Navigation Buttons */}
            <div className="eq-nav-footer">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className="eq-btn-prev"
              >
                <ArrowLeft size={16} />
                <span>{isHindi ? 'पिछला चरण' : 'Previous Step'}</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="eq-btn-next"
              >
                {currentStep === 7 ? (
                  <>
                    <span>{isHindi ? 'समीक्षा देखें' : 'Review Summary'}</span>
                    <ChevronRight size={18} />
                  </>
                ) : (
                  <>
                    <span>{isHindi ? 'अगला चरण' : 'Next Step'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 8: REVIEW & EDIT SUMMARY SCREEN */}
        {/* ------------------------------------------------------------- */}
        {currentStep === 8 && (
          <div className="eq-card">
            <div className="eq-review-header">
              <div>
                <div style={{ marginBottom: '6px' }}>
                  <span className="eq-badge eq-badge-emerald">
                    {isHindi ? 'अंतिम चरण' : 'Step 8 of 8'}
                  </span>
                </div>
                <h2 className="eq-category-title" style={{ fontSize: '1.65rem' }}>
                  {isHindi ? 'प्रश्नावली सारांश एवं अंतिम समीक्षा' : 'Review & Verify Your Profile Inputs'}
                </h2>
                <p className="eq-category-desc">
                  {isHindi
                    ? 'कृपया अपने सभी उत्तरों की जांच करें। किसी भी श्रेणी को बदलने के लिए "संपादित करें" पर क्लिक करें।'
                    : 'Check your submitted details below before executing the deterministic eligibility engine.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleSubmitAssessment}
                disabled={isSubmitting}
                className="eq-btn-evaluate"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>{isHindi ? 'मूल्यांकन जारी है...' : 'Evaluating Rules...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>{isHindi ? 'पात्रता की आधिकारिक जांच करें' : 'Run Eligibility Check'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Category Summary Cards */}
            <div className="eq-review-grid">
              {CATEGORY_DEFINITIONS.map(cat => {
                const IconComp = cat.icon;
                const catQuestions = questions.filter(q => q.category === cat.id);

                return (
                  <div key={cat.id} className="eq-review-card">
                    <div className="eq-review-card-header">
                      <div className="eq-review-card-title">
                        <IconComp size={18} style={{ color: '#10b981' }} />
                        <span>{isHindi ? cat.title_hi : cat.title_en}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(cat.step)}
                        className="eq-review-edit-link"
                      >
                        <Edit3 size={13} />
                        <span>{isHindi ? 'संपादित करें' : 'Edit'}</span>
                      </button>
                    </div>

                    <div className="eq-review-rows">
                      {catQuestions.slice(0, 4).map(q => {
                        const val = answers[q.field];
                        let displayVal = isHindi ? 'अनुत्तरित' : 'Not Answered';

                        if (val === true) displayVal = isHindi ? 'हाँ' : 'Yes';
                        else if (val === false) displayVal = isHindi ? 'नहीं' : 'No';
                        else if (val === 'not_sure') displayVal = isHindi ? 'निश्चित नहीं' : 'Not Sure';
                        else if (val !== null && val !== undefined && val !== '') displayVal = String(val);

                        return (
                          <div key={q.id} className="eq-review-row">
                            <span className="eq-review-row-label">
                              {isHindi ? q.label_hi : q.label_en}
                            </span>
                            <span className="eq-review-row-val">
                              {displayVal}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="eq-nav-footer">
              <button
                type="button"
                onClick={() => setCurrentStep(7)}
                className="eq-btn-prev"
              >
                <ArrowLeft size={16} />
                <span>{isHindi ? 'दस्तावेज चरण पर वापस जाएं' : 'Back to Documents'}</span>
              </button>

              <button
                type="button"
                onClick={handleSubmitAssessment}
                disabled={isSubmitting}
                className="eq-btn-evaluate"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>{isHindi ? 'मूल्यांकन चल रहा है...' : 'Evaluating Rules...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>{isHindi ? 'पात्रता की आधिकारिक जांच करें' : 'Run Eligibility Check'}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
