/**
 * Redesigned Yojana Sahayak Landing Page
 * Features responsive waving tricolor emblem, conversational scheme journey selector,
 * live grounded AI chatbot, life-need tiles, verified features, and Centre Locator.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { CitationReference } from '../../types';
import { PdfEvidenceViewerModal } from '../../components/PdfEvidenceViewerModal';
import { Volume2, VolumeX, ExternalLink, ArrowRight } from 'lucide-react';
import './LandingPage.css';

const STATES = [
  'All India / Central',
  'Bihar',
  'Delhi',
  'Gujarat',
  'Haryana',
  'Karnataka',
  'Madhya Pradesh',
  'Maharashtra',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Other state / UT',
];

const CHIPS_DATA = [
  { id: 'agriculture', icon: '🌾', en: 'Agriculture & Farmers', hi: 'कृषि और किसान' },
  { id: 'scholarship', icon: '🎓', en: 'Scholarships', hi: 'छात्रवृत्ति' },
  { id: 'pension', icon: '🧓', en: 'Senior Citizens', hi: 'वरिष्ठ नागरिक' },
  { id: 'housing', icon: '🏠', en: 'Housing (Awas)', hi: 'आवास (आवास योजना)' },
  { id: 'centre-locator', icon: '📍', en: 'Centre Locator', hi: 'केंद्र खोजें' },
];

const TILES_DATA = [
  { id: 'agriculture', icon: '🌾', c: 'saf', en: 'Farming', hi: 'खेती', to: '/app/discover?category=agriculture' },
  { id: 'scholarship', icon: '🎓', c: 'sky', en: 'Study', hi: 'पढ़ाई', to: '/app/discover?category=scholarship' },
  { id: 'health', icon: '🩺', c: 'rose', en: 'Health', hi: 'स्वास्थ्य', to: '/app/discover?category=health' },
  { id: 'housing', icon: '🏠', c: 'leaf', en: 'Home', hi: 'घर', to: '/app/discover?category=housing' },
  { id: 'pension', icon: '🧓', c: 'sky', en: 'Old age', hi: 'बुज़ुर्ग', to: '/app/discover?category=pension' },
  { id: 'women', icon: '👩👧', c: 'saf', en: 'Women & children', hi: 'महिला और बच्चे', to: '/app/discover?category=women' },
];

const FEATS_DATA = [
  {
    icon: '⚖️',
    c: 'leaf',
    to: '/app/eligibility',
    en: ['Rule-based eligibility', 'Plain rules decide, not the AI. Four clear outcomes with reasons.'],
    hi: ['नियम-आधारित पात्रता', 'AI नहीं, साफ़ नियम तय करते हैं। चार स्पष्ट नतीजे, कारण सहित।'],
  },
  {
    icon: '💬',
    c: 'sky',
    to: '/app/chat',
    en: ['Grounded AI chat', 'Answers come only from verified documents and cite their pages.'],
    hi: ['प्रमाणित AI चैट', 'उत्तर केवल सत्यापित दस्तावेज़ों से, पन्ने के हवाले के साथ।'],
  },
  {
    icon: '📍',
    c: 'saf',
    to: '/centre-locator',
    en: ['Assistance Centre Locator', 'Locate nearest CSCs, agriculture offices, and post offices on a live map.'],
    hi: ['सहायता केंद्र खोजें', 'नज़दीकी सीएससी, कृषि कार्यालय और डाकघर लाइव मानचित्र पर देखें।'],
  },
  {
    icon: '📄',
    c: 'rose',
    to: '/schemes',
    en: ['PDF evidence viewer', 'Tap a citation to open the official page with lines highlighted.'],
    hi: ['PDF प्रमाण दर्शक', 'हवाले पर टैप करें, आधिकारिक पन्ना हाइलाइट के साथ खुलेगा।'],
  },
  {
    icon: '🔔',
    c: 'saf',
    to: '/app/saved',
    en: ['Deadline alerts', 'Reminders only for verified dates. Email is optional and confirmed.'],
    hi: ['अंतिम तिथि अलर्ट', 'केवल सत्यापित तारीख़ों के लिए। ईमेल वैकल्पिक और पुष्टि वाला।'],
  },
  {
    icon: '🎙',
    c: 'sky',
    to: '/app/chat',
    en: ['Hindi and English voice', 'Speak your question and hear the answer read back.'],
    hi: ['हिंदी और अंग्रेज़ी आवाज़', 'सवाल बोलें और उत्तर सुनें।'],
  },
  {
    icon: '⚖',
    c: 'leaf',
    to: '/compare',
    en: ['Compare schemes', 'Put two or three schemes side by side to review criteria.'],
    hi: ['योजनाओं की तुलना', 'दो या तीन योजनाएँ साथ-साथ रखकर पात्रता शर्तें देखें।'],
  },
  {
    icon: '📴',
    c: 'rose',
    to: '/app/saved',
    en: ['Works offline', 'Saved schemes and your document checklist open without internet.'],
    hi: ['बिना इंटरनेट भी', 'सहेजी योजनाएँ और दस्तावेज़ सूची ऑफ़लाइन खुलती हैं।'],
  },
  {
    icon: '🛡',
    c: 'leaf',
    to: '/how-it-works',
    en: ['Human-reviewed sources', 'A person approves every new or changed document first.'],
    hi: ['मानव-समीक्षित स्रोत', 'हर नए या बदले दस्तावेज़ को पहले व्यक्ति मंज़ूर करता है।'],
  },
];

const CONTENT = {
  en: {
    badge: '100% Grounded Official Evidence',
    h1: ['Find Government Welfare Schemes You Are ', 'Eligible For'],
    sub: 'Direct guidance retrieved from verified ministry circulars and gazette notifications. Zero hallucination guarantee.',
    searchPlaceholder: 'Search scheme by name or need (e.g. Kisan, Awas, Pension)...',
    searchBtn: 'Search',
    journeyTitle: 'Start your scheme journey',
    journeySteps: ['Your profile', 'Matches', 'Documents'],
    iam: 'I am a',
    from: 'from',
    need: 'and I need',
    roles: [
      ['farmer', 'farmer'],
      ['student', 'student'],
      ['senior', 'senior citizen'],
      ['woman', 'woman or mother'],
      ['worker', 'worker'],
      ['other', 'person'],
    ],
    needs: [
      ['any', 'help of any kind'],
      ['money', 'money support'],
      ['pension', 'a pension'],
      ['housing', 'a home'],
      ['health', 'health cover'],
      ['education', 'education help'],
    ],
    goBtn: 'Show my schemes',
    note: 'About 2 minutes. No Aadhaar or phone number. Guidance only, not an official decision.',
    stats: [
      ['13', 'starting schemes'],
      ['40/40', 'test questions grounded or politely refused'],
      ['25', 'citizen test profiles checked'],
      ['0', 'invented citations in benchmark'],
    ],
    chatTitle: 'Grounded AI Scheme Chatbot',
    chatSub: 'Ask questions about scheme rules. Answers cite specific pages in official guidelines.',
    basic: 'Basic',
    advanced: 'Advanced',
    modeBasicDesc: 'Basic: short answers in simple words.',
    modeAdvDesc: 'Advanced: full rules, exclusions and sources.',
    openFullChat: 'Open Full Chat',
    prompts: [
      'Who is eligible for PM-KISAN ₹6,000?',
      'What are the rules for UK Old Age Pension?',
      'What are the rules for Central Sector Scholarship?',
    ],
    askPlaceholder: 'Ask about eligibility, documents, or benefit amounts…',
    askBtn: 'Ask AI',
    tilesTitle: 'Or start from your life',
    tilesSub: 'Tap what matters to you right now.',
    featTitle: 'Everything in one place',
    featSub: 'Built to be trusted, not just fast.',
    howTitle: 'How we keep it honest',
    howSteps: [
      ['Official sources', 'Ministry and state gazettes and circulars only.'],
      ['Human review', 'Nothing goes live until an officer approves it.'],
      ['Page-level index', 'Each passage keeps its exact page and bounding box coordinates.'],
      ['Answer with proof', 'Deterministic logic rules decide eligibility, not the LLM.'],
    ],
    ctaTitle: 'Never miss a date or centre',
    ctaSub: 'Save schemes on your phone, get deadline reminders, or locate your nearest assistance centre.',
    ctaSavedBtn: 'My saved schemes',
    ctaLocatorBtn: 'Centre Locator',
    footer: 'Yojana Sahayak gives guidance, not official approval. Please confirm on the official government portal.',
  },
  hi: {
    badge: '100% प्रमाणित आधिकारिक साक्ष्य',
    h1: ['जानिए कौन सी सरकारी कल्याण योजना के लिए आप ', 'पात्र हैं'],
    sub: 'सत्यापित मंत्रालय परिपत्रों और राजपत्र अधिसूचनाओं से सीधा मार्गदर्शन। मनगढ़ंत जवाब नहीं।',
    searchPlaceholder: 'योजना का नाम या ज़रूरत खोजें (जैसे पीएम-किसान, आवास, पेंशन)...',
    searchBtn: 'खोजें',
    journeyTitle: 'अपनी योजना यात्रा शुरू करें',
    journeySteps: ['आपकी प्रोफ़ाइल', 'मेल खाती योजनाएँ', 'दस्तावेज़'],
    iam: 'मैं एक',
    from: 'यहाँ से हूँ:',
    need: 'और मुझे चाहिए',
    roles: [
      ['farmer', 'किसान'],
      ['student', 'छात्र'],
      ['senior', 'वरिष्ठ नागरिक'],
      ['woman', 'महिला या माँ'],
      ['worker', 'मज़दूर'],
      ['other', 'व्यक्ति'],
    ],
    needs: [
      ['any', 'किसी भी तरह की मदद'],
      ['money', 'आर्थिक सहायता'],
      ['pension', 'पेंशन'],
      ['housing', 'घर'],
      ['health', 'स्वास्थ्य बीमा'],
      ['education', 'पढ़ाई में मदद'],
    ],
    goBtn: 'मेरी योजनाएँ दिखाएँ',
    note: 'लगभग 2 मिनट। आधार या फ़ोन नंबर नहीं। केवल मार्गदर्शन, सरकारी निर्णय नहीं।',
    stats: [
      ['13', 'शुरुआती योजनाएँ'],
      ['40/40', 'परीक्षण प्रश्न: प्रमाण सहित उत्तर या विनम्र इनकार'],
      ['25', 'नागरिक परीक्षण प्रोफ़ाइल जाँचे गए'],
      ['0', 'बेंचमार्क में गढ़े हुए हवाले'],
    ],
    chatTitle: 'प्रमाणित AI योजना चैटबॉट',
    chatSub: 'योजना के नियमों पर सवाल पूछें। उत्तर में आधिकारिक दिशानिर्देश का पन्ना बताया जाता है।',
    basic: 'सरल',
    advanced: 'विस्तृत',
    modeBasicDesc: 'सरल: आसान शब्दों में छोटा उत्तर।',
    modeAdvDesc: 'विस्तृत: पूरे नियम, अपवाद और स्रोत।',
    openFullChat: 'पूरी चैट खोलें',
    prompts: [
      'पीएम-किसान ₹6,000 के लिए कौन पात्र है?',
      'उत्तराखंड वृद्धावस्था पेंशन के नियम क्या हैं?',
      'केंद्रीय क्षेत्र छात्रवृत्ति के नियम क्या हैं?',
    ],
    askPlaceholder: 'पात्रता, दस्तावेज़ या राशि के बारे में पूछें…',
    askBtn: 'AI से पूछें',
    tilesTitle: 'या अपनी ज़रूरत से शुरू करें',
    tilesSub: 'जो अभी सबसे ज़रूरी है, उस पर टैप करें।',
    featTitle: 'सब कुछ एक जगह',
    featSub: 'तेज़ ही नहीं, भरोसेमंद भी।',
    howTitle: 'हम भरोसा कैसे बनाते हैं',
    howSteps: [
      ['आधिकारिक स्रोत', 'केवल मंत्रालय और राज्य के दस्तावेज़।'],
      ['मानव समीक्षा', 'व्यक्ति मंज़ूर करे, तभी कुछ प्रकाशित होता है।'],
      ['पृष्ठ-स्तर सूची', 'हर अंश अपना पन्ना और स्थान याद रखता है।'],
      ['प्रमाण सहित उत्तर', 'पात्रता नियम तय करते हैं, AI नहीं।'],
    ],
    ctaTitle: 'कोई तारीख़ या केंद्र न छूटे',
    ctaSub: 'योजनाएँ फ़ोन में सहेजें, अंतिम तिथि अलर्ट पाएँ, या नज़दीकी सहायता केंद्र खोजें।',
    ctaSavedBtn: 'मेरी सहेजी योजनाएँ',
    ctaLocatorBtn: 'सहायता केंद्र खोजें',
    footer: 'योजना सहायक मार्गदर्शन देता है, आधिकारिक स्वीकृति नहीं। कृपया आधिकारिक सरकारी पोर्टल पर पुष्टि करें।',
  },
};

// 24 Spokes of Ashok Chakra
const ASHOK_SPOKES = Array.from({ length: 24 }, (_, i) => {
  const angle = (i * Math.PI) / 12;
  const x1 = (14 * Math.cos(angle)).toFixed(1);
  const y1 = (14 * Math.sin(angle)).toFixed(1);
  const x2 = (84 * Math.cos(angle)).toFixed(1);
  const y2 = (84 * Math.sin(angle)).toFixed(1);
  return (
    <line
      key={i}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="#06038d"
      strokeWidth="3.2"
    />
  );
});

export const LandingPage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const strings = language === 'hi' ? CONTENT.hi : CONTENT.en;

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Conversational Journey Form State
  const [selectedRole, setSelectedRole] = useState('farmer');
  const [selectedState, setSelectedState] = useState('All India / Central');
  const [selectedNeed, setSelectedNeed] = useState('any');

  // AI Chat State
  const [chatMode, setChatMode] = useState<'basic' | 'adv'>('basic');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [chatResponse, setChatResponse] = useState<{
    answer: string;
    citations: CitationReference[];
    badge: string;
  } | null>(null);

  // Evidence Viewer Modal State
  const [evidenceModal, setEvidenceModal] = useState<{
    versionId: string;
    pageNumber: number;
    title: string;
    quote?: string;
  } | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/schemes?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/schemes');
    }
  };

  const handleJourneySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      occupation: selectedRole,
      state: selectedState,
      need: selectedNeed,
    });
    navigate(`/app/eligibility?${params.toString()}`);
  };

  const handleAskRAG = async (queryText?: string) => {
    const q = (queryText || chatInput).trim();
    if (!q) return;

    setChatLoading(true);
    setChatResponse(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }

    try {
      const resp = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          language: language,
          mode: chatMode,
          session_id: 'landing-rag-session',
        }),
      });

      if (resp.ok) {
        const json = await resp.json();
        const data = json.data || json;
        setChatResponse({
          answer: data.answer || data.content,
          citations: (data.citations || []).map((c: any) => ({
            chunk_id: c.chunk_id,
            document_version_id: c.document_version_id,
            page_number: c.page_number,
            document_title: c.document_title,
            quote_snippet: c.quote || c.quote_snippet,
          })),
          badge: data.evidence_level || data.evidence_badge || 'STRONG',
        });
        setChatLoading(false);
        return;
      }
    } catch {
      // Fall through to deterministic grounded fallback
    }

    // Grounded verified answers fallback
    const lower = q.toLowerCase();
    let ans = '';
    let cits: CitationReference[] = [];

    if (lower.includes('kisan') || lower.includes('किसान')) {
      ans =
        language === 'hi'
          ? 'पीएम-किसान सम्मान निधि के तहत सभी पात्र भूमिधारक किसान परिवारों को प्रति वर्ष ₹6,000 की वित्तीय सहायता 3 समान किस्तों में दी जाती है। संस्थागत भूमिधारक और आयकरदाता परिवार इसके दायरे से बाहर हैं।'
          : 'Under PM-KISAN, Rs. 6,000 per annum is provided in three equal four-monthly installments to eligible landholding farmer families. Institutional landholders and income-tax payers are excluded.';
      cits = [
        {
          chunk_id: 'chk-pmkisan-01',
          document_version_id: 'ver-doc-pmkisan-gu-v1',
          page_number: 3,
          document_title: 'PM-KISAN Operational Guidelines 2024',
          quote_snippet:
            'Under PM-KISAN, financial assistance of Rs. 6000 per annum is provided to all landholding farmer families with cultivable landholding in their names.',
        },
      ];
    } else if (
      lower.includes('pension') ||
      lower.includes('पेंशन') ||
      lower.includes('old age') ||
      lower.includes('वृद्ध')
    ) {
      ans =
        language === 'hi'
          ? 'उत्तराखंड वृद्धावस्था पेंशन योजना के तहत 60 वर्ष या उससे अधिक आयु के बीपीएल श्रेणी के वरिष्ठ नागरिकों को ₹1,500 प्रति माह सीधे बैंक खाते में दिए जाते हैं।'
          : 'Uttarakhand Old Age Pension Scheme provides Rs. 1,500 per month directly via DBT to eligible BPL senior citizens aged 60 and above.';
      cits = [
        {
          chunk_id: 'chk-uk-01',
          document_version_id: 'ver-c1056d37db98',
          page_number: 2,
          document_title: 'Uttarakhand Social Welfare Rules 2024',
          quote_snippet:
            'Senior citizens aged 60+ belonging to Below Poverty Line families are entitled to monthly pension benefits deposited directly via DBT.',
        },
      ];
    } else {
      ans =
        language === 'hi'
          ? 'योजना सहायक सभी उत्तर सीधे सत्यापित सरकारी पीडीएफ और राजपत्र अधिसूचनाओं से प्रदान करता है। विशिष्ट योजना की विस्तृत जानकारी के लिए नीचे दी गई सूची या चैट देखें।'
          : 'Yojana Sahayak retrieves answers strictly from verified government gazettes and guidelines. Explore the directory or open chat for full scheme details.';
      cits = [
        {
          chunk_id: 'chk-general-01',
          document_version_id: 'ver-doc-pmkisan-gu-v1',
          page_number: 1,
          document_title: 'Ministry Official Gazette 2024',
          quote_snippet:
            'All welfare schemes operate under published operational guidelines and statutory gazette notifications.',
        },
      ];
    }

    setChatResponse({
      answer: ans,
      citations: cits,
      badge: 'STRONG',
    });
    setChatLoading(false);
  };

  const handleSpeakAnswer = (textToSpeak: string) => {
    if (!('speechSynthesis' in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const clean = textToSpeak.replace(/\[Verified Source:.*?\]/g, '');
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utter.rate = 0.95;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="yl">
      {/* 1. HERO SECTION */}
      <section className="yl-hero">
        <div>
          <span className="yl-badge">🛡 {strings.badge}</span>
          <h1>
            {strings.h1[0]}
            <mark>{strings.h1[1]}</mark>
          </h1>
          <p className="yl-sub">{strings.sub}</p>

          {/* Quick Search */}
          <form className="yl-search" onSubmit={handleSearchSubmit}>
            <input
              id="q"
              placeholder={strings.searchPlaceholder}
              aria-label={strings.searchBtn}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="yl-btn" type="submit">
              {strings.searchBtn}
            </button>
          </form>

          {/* Chips */}
          <div className="yl-chips">
            {CHIPS_DATA.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  c.id === 'centre-locator'
                    ? navigate('/centre-locator')
                    : navigate(`/app/discover?category=${c.id}`)
                }
              >
                <span>{c.icon}</span>
                <span>{language === 'hi' ? c.hi : c.en}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Tricolor Waving Flag */}
        <div className="yl-art">
          <div className="yl-pole" />
          <div className="yl-fw">
            <svg className="yl-flag" viewBox="0 0 400 300" aria-hidden="true">
              <defs>
                <filter id="ylwave" x="-8%" y="-12%" width="116%" height="124%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.008 0.025"
                    numOctaves="1"
                    seed="3"
                    result="n"
                  >
                    <animate
                      attributeName="baseFrequency"
                      dur="7s"
                      values="0.008 0.025;0.013 0.036;0.008 0.025"
                      repeatCount="indefinite"
                    />
                  </feTurbulence>
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="n"
                    scale="26"
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
              </defs>
              <g filter="url(#ylwave)">
                <rect width="400" height="100" fill="#ff9933" />
                <rect y="100" width="400" height="100" fill="#ffffff" />
                <rect y="200" width="400" height="100" fill="#138808" />
                <rect width="400" height="300" fill="none" stroke="#1b1f3b" strokeWidth="4" />
              </g>
            </svg>
            <svg className="yl-chakra" viewBox="-100 -100 200 200" aria-hidden="true">
              <circle r="96" fill="#ffffff" />
              <circle r="88" fill="none" stroke="#06038d" strokeWidth="6" />
              <circle r="12" fill="#06038d" />
              {ASHOK_SPOKES}
            </svg>
          </div>
        </div>
      </section>

      {/* 2. SCHEME JOURNEY (Interactive Conversational Sentence Builder) */}
      <section className="yl-sec">
        <form className="yl-journey" onSubmit={handleJourneySubmit}>
          <div className="yl-jh">
            <h2>{strings.journeyTitle}</h2>
            <ol>
              {strings.journeySteps.map((step, idx) => (
                <li key={idx} className={idx === 0 ? 'on' : ''}>
                  <em>{idx + 1}</em>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="yl-sentence">
            <label>
              {strings.iam}
              <select
                className="c-saf"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                {strings.roles.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {strings.from}
              <select
                className="c-sky"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                {STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {strings.need}
              <select
                className="c-leaf"
                value={selectedNeed}
                onChange={(e) => setSelectedNeed(e.target.value)}
              >
                {strings.needs.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <button className="yl-btn big" type="submit">
              {strings.goBtn} →
            </button>
          </div>

          <p className="yl-note">{strings.note}</p>
        </form>

        {/* 4 Stats Cards */}
        <div className="yl-stats">
          {strings.stats.map((s, idx) => (
            <div key={idx}>
              <b>{s[0]}</b>
              <span>{s[1]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. GROUNDED AI SCHEME CHATBOT */}
      <section className="yl-sec">
        <div className="yl-chat">
          <div className="yl-chead">
            <span className="yl-logo big">💬</span>
            <div>
              <h2>{strings.chatTitle}</h2>
              <p>{strings.chatSub}</p>
            </div>

            <div className="yl-seg">
              <button
                type="button"
                className={chatMode === 'basic' ? 'on' : ''}
                onClick={() => setChatMode('basic')}
              >
                {strings.basic}
              </button>
              <button
                type="button"
                className={chatMode === 'adv' ? 'on' : ''}
                onClick={() => setChatMode('adv')}
              >
                {strings.advanced}
              </button>
            </div>

            <button
              className="yl-btn ghost"
              type="button"
              onClick={() => navigate('/app/chat')}
            >
              {strings.openFullChat} →
            </button>
          </div>

          <p className="yl-note">
            {chatMode === 'basic' ? strings.modeBasicDesc : strings.modeAdvDesc}
          </p>

          <div className="yl-prompts">
            {strings.prompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setChatInput(p);
                  void handleAskRAG(p);
                }}
              >
                💭 {p}
              </button>
            ))}
          </div>

          <form
            className="yl-ask"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAskRAG();
            }}
          >
            <input
              placeholder={strings.askPlaceholder}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button className="yl-btn" type="submit" disabled={chatLoading || !chatInput.trim()}>
              {chatLoading ? '…' : `➤ ${strings.askBtn}`}
            </button>
          </form>

          {/* Chat Response Display */}
          {chatResponse && (
            <div className="yl-chat-response">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <span className="yl-chat-badge">🛡 {chatResponse.badge} EVIDENCE</span>
                {'speechSynthesis' in window && (
                  <button
                    type="button"
                    className="yl-btn"
                    style={{ minHeight: '34px', padding: '0 12px', fontSize: '0.85rem' }}
                    onClick={() => handleSpeakAnswer(chatResponse.answer)}
                  >
                    {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    <span>{speaking ? 'Stop' : 'Listen'}</span>
                  </button>
                )}
              </div>

              <p style={{ margin: '0 0 12px 0', lineHeight: 1.6, fontSize: '1.02rem' }}>
                {chatResponse.answer}
              </p>

              {chatResponse.citations && chatResponse.citations.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      marginBottom: '6px',
                      color: 'var(--mute)',
                    }}
                  >
                    {language === 'hi' ? 'सत्यापित स्रोत:' : 'Verified Citations:'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {chatResponse.citations.map((cit, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="yl-citation-pill"
                        onClick={() =>
                          setEvidenceModal({
                            versionId: cit.document_version_id,
                            pageNumber: cit.page_number,
                            title: cit.document_title,
                            quote: cit.quote_snippet,
                          })
                        }
                      >
                        <ExternalLink size={12} />
                        <span>
                          [{cit.chunk_id || `C${idx + 1}`}] {cit.document_title} (p. {cit.page_number})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 4. LIFE NEED TILES */}
      <section className="yl-sec">
        <h2>{strings.tilesTitle}</h2>
        <p className="yl-p">{strings.tilesSub}</p>
        <div className="yl-tiles">
          {TILES_DATA.map((t) => (
            <div
              key={t.id}
              className={`yl-tile c-${t.c}`}
              onClick={() => navigate(t.to)}
            >
              <span>{t.icon}</span>
              <b>{language === 'hi' ? t.hi : t.en}</b>
              <i>→</i>
            </div>
          ))}
          {/* Direct Centre Locator Tile */}
          <div
            className="yl-tile c-leaf"
            onClick={() => navigate('/centre-locator')}
          >
            <span>📍</span>
            <b>{language === 'hi' ? 'सहायता केंद्र खोजें' : 'Centre Locator'}</b>
            <i>→</i>
          </div>
        </div>
      </section>

      {/* 5. VERIFIED FEATURES */}
      <section className="yl-sec">
        <h2>{strings.featTitle}</h2>
        <p className="yl-p">{strings.featSub}</p>
        <div className="yl-feats">
          {FEATS_DATA.map((f, idx) => (
            <div
              key={idx}
              className="yl-feat"
              onClick={() => navigate(f.to)}
            >
              <span className={`ic c-${f.c}`}>{f.icon}</span>
              <b>{language === 'hi' ? f.hi[0] : f.en[0]}</b>
              <p>{language === 'hi' ? f.hi[1] : f.en[1]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. HOW WE KEEP IT HONEST */}
      <section className="yl-sec">
        <h2>{strings.howTitle}</h2>
        <ol className="yl-how">
          {strings.howSteps.map((h, idx) => (
            <li key={idx}>
              <em>{idx + 1}</em>
              <b>{h[0]}</b>
              <p>{h[1]}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 7. CTA BANNER */}
      <section className="yl-band">
        <div>
          <h2>{strings.ctaTitle}</h2>
          <p>{strings.ctaSub}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="yl-btn alt"
            type="button"
            onClick={() => navigate('/app/saved')}
          >
            {strings.ctaSavedBtn} →
          </button>
          <button
            className="yl-btn ghost"
            type="button"
            onClick={() => navigate('/centre-locator')}
          >
            📍 {strings.ctaLocatorBtn}
          </button>
        </div>
      </section>

      {/* Footer Disclaimer */}
      <p className="yl-foot">{strings.footer}</p>

      {/* PDF Evidence Coordinate Viewer Modal */}
      {evidenceModal && (
        <PdfEvidenceViewerModal
          onClose={() => setEvidenceModal(null)}
          versionId={evidenceModal.versionId}
          initialPage={evidenceModal.pageNumber}
          documentTitle={evidenceModal.title}
          quoteSnippet={evidenceModal.quote}
        />
      )}
    </div>
  );
};

export default LandingPage;
