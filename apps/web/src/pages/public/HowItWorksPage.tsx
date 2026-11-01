/**
 * How It Works Page: Explaining the 5-Stage Document Intelligence Pipeline
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileSearch,
  ScanText,
  Database,
  Binary,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const HowItWorksPage: React.FC = () => {
  const { language } = useLanguage();

  const steps = [
    {
      num: '01',
      title: language === 'hi' ? 'स्रोतों की खोज और अनुपालन द्वार' : 'Source Discovery & Compliance Gate',
      desc: language === 'hi'
        ? 'आधिकारिक मंत्रालयों और राज्य पोर्टलों से योजनाओं की खोज की जाती है। यदि स्रोत अनुमति नहीं देता (जैसे myScheme), तो स्वचालन स्वतः अवरुद्ध रहता है।'
        : 'Discovers permitted listing pages and gazettes. If a source prohibits automated scraping (such as myScheme), automation remains locked in manual-only mode.',
      icon: FileSearch,
      badge: 'Step 1'
    },
    {
      num: '02',
      title: language === 'hi' ? 'पीडीएफ निष्कर्षण और निर्देशांक मैपिंग' : 'PDF Ingestion & Coordinate Mapping',
      desc: language === 'hi'
        ? 'PyMuPDF और Tesseract OCR के माध्यम से प्रत्येक पृष्ठ का डिजिटल पाठ और सटीक ज्यामितीय निर्देशांक (Bounding Boxes) संगृहीत किए जाते हैं।'
        : 'PyMuPDF and OCR extract digital text while preserving exact page-level bounding box coordinates for faithful highlight overlays.',
      icon: ScanText,
      badge: 'Step 2'
    },
    {
      num: '03',
      title: language === 'hi' ? 'मानव सत्यापन एवं समीक्षा' : 'Human Verification & Approval',
      desc: language === 'hi'
        ? 'कोई भी खोजा गया दस्तावेज़ सीधे लाइव नहीं होता। प्रशासक कतार में समीक्षा के बाद ही दस्तावेज़ को सत्यापित प्रमाण का दर्जा दिया जाता है।'
        : 'No raw scrape goes live automatically. Administrative reviewers inspect cryptographic hashes and authoritatively approve evidence.',
      icon: ShieldCheck,
      badge: 'Step 3'
    },
    {
      num: '04',
      title: language === 'hi' ? 'द्विभाषी RAG एवं उद्धरण सत्यापन' : 'Multilingual RAG & Citation Validation',
      desc: language === 'hi'
        ? 'Groq LLM द्वारा तैयार उत्तरों के प्रत्येक वाक्य की पुष्टि की जाती है। यदि कोई दावा बिना प्रमाण के हो, तो उसे तुरंत हटा दिया जाता है या उत्तर अस्वीकार किया जाता है।'
        : 'Groq LLM synthesizes bilingual answers strictly from retrieved verified chunks. A deterministic validator verifies citations before display.',
      icon: Database,
      badge: 'Step 4'
    },
    {
      num: '05',
      title: language === 'hi' ? 'गणितीय पात्रता निर्धारण' : 'Deterministic 3-Valued Rule Evaluation',
      desc: language === 'hi'
        ? 'पात्रता का निर्णय भाषा मॉडल नहीं, बल्कि मानव-स्वीकृत पायथन नियम करते हैं: Eligible, Likely Eligible, Need More Info, या Not Eligible।'
        : 'Zero LLM hallucination in eligibility. Python evaluates approved condition trees using true, false, and unknown logic with complete explanations.',
      icon: Binary,
      badge: 'Step 5'
    }
  ];

  return (
    <div className="container" style={{ padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <div style={{ maxWidth: '720px' }}>
        <span className="badge badge-emerald" style={{ marginBottom: '0.75rem' }}>
          Architecture & Integrity
        </span>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          {language === 'hi' ? 'दस्तावेज़ से सटीक मार्गदर्शन तक की यात्रा' : 'From Official Gazette to Verified Citizen Guidance'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
          {language === 'hi'
            ? 'जानिए कैसे योजना सहायक आधिकारिक सरकारी अधिसूचनाओं को पारदर्शी, भरोसेमंद और प्रमाण-आधारित मार्गदर्शन में परिवर्तित करता है।'
            : 'How Yojana Sahayak turns complex government notifications into understandable, verifiable citizen outcomes with zero hallucination.'}
        </p>
      </div>

      {/* 5 Pipeline Stages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {steps.map(step => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="glass-card"
              style={{
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'flex-start',
                padding: '2rem'
              }}
            >
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--accent-primary)',
                  background: 'var(--accent-primary-light)',
                  width: '54px',
                  height: '54px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {step.num}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon size={20} style={{ color: 'var(--accent-primary)' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{step.title}</h3>
                  <span className="badge badge-muted">{step.badge}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invalidation Rule Notice */}
      <div
        className="glass-card"
        style={{
          borderLeft: '4px solid var(--accent-saffron)',
          background: 'var(--accent-saffron-light)',
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <AlertTriangle size={24} style={{ color: 'var(--accent-saffron)', flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-saffron)', marginBottom: '0.25rem' }}>
              {language === 'hi' ? 'स्रोतों के बदलाव पर स्वचालित नियम निष्क्रियता' : 'Automatic Rule Invalidation on Source Change'}
            </h4>
            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              {language === 'hi'
                ? 'यदि किसी योजना के सरकारी आदेश या पीडीएफ में 1 बाइट का भी परिवर्तन होता है, तो उससे जुड़े सभी नियम स्वतः `needs_review` स्थिति में चले जाते हैं। मानव द्वारा दोबारा स्वीकृत किए बिना कोई पुराना नियम परिणाम नहीं दे सकता।'
                : 'If a governing government circular changes even by 1 byte, all linked eligibility rules are immediately set to `needs_review`. They cannot produce eligibility verdicts until human re-approval.'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <Link to="/app/eligibility" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
          <CheckCircle2 size={18} />
          {language === 'hi' ? 'अपनी पात्रता जांचें' : 'Start Your Eligibility Check'}
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
};
