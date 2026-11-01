/**
 * Centralized Internationalization (i18n) Context — Hindi (हिन्दी) & English
 *
 * Implements:
 * - Structured namespaces: common, navigation, dashboard, schemes, eligibility,
 *   chatbot, voice, profile, settings, admin, notifications, validation, errors.
 * - 100% backward compatibility for flat dot-notation keys.
 * - Reactive language updates across all views without page reloads or form wipes.
 * - Language persistence in localStorage and document.documentElement.lang sync.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Language } from '../types';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = 'yojana_language';

const translations: Record<Language, Record<string, string>> = {
  hi: {
    // ---------------- COMMON ----------------
    'common.save': 'सहेजें',
    'common.saved': 'सहेजा गया',
    'common.cancel': 'रद्द करें',
    'common.close': 'बंद करें',
    'common.confirm': 'पुष्टि करें',
    'common.back': 'पीछे जाएं',
    'common.next': 'आगे बढ़ें',
    'common.submit': 'प्रस्तुत करें',
    'common.retry': 'पुनः प्रयास करें',
    'common.clear': 'हटाएं',
    'common.delete': 'मिटाएं',
    'common.edit': 'संपादित करें',
    'common.loading': 'लोड हो रहा है...',
    'common.search': 'खोजें',
    'common.filter': 'फ़िल्टर',
    'common.all': 'सभी',
    'common.viewAll': 'सभी देखें →',
    'common.details': 'विवरण',
    'common.apply': 'आवेदन करें',
    'common.compare': 'तुलना करें',
    'common.status': 'स्थिति',
    'common.verified': 'सत्यापित प्रमाण',
    'common.pending': 'समीक्षा लंबित',
    'common.approved': 'स्वीकृत',
    'common.rejected': 'अस्वीकृत',
    'common.offline': 'ऑफ़लाइन मोड सक्रिय',
    'common.online': 'ऑनलाइन कनेक्टेड',

    // Legacy buttons mapped to common
    'btn.save': 'सहेजें',
    'btn.saved': 'सहेजा गया',
    'btn.applyNow': 'आधिकारिक पोर्टल पर जाएं',
    'btn.checkEligibility': 'पात्रता जांचें',
    'btn.retry': 'पुनः प्रयास करें',
    'btn.clear': 'हटाएं',
    'btn.submit': 'प्रस्तुत करें',
    'btn.next': 'आगे बढ़ें',
    'btn.back': 'पीछे जाएं',
    'btn.close': 'बंद करें',
    'btn.cancel': 'रद्द करें',
    'btn.confirm': 'पुष्टि करें',

    // ---------------- NAVIGATION ----------------
    'navigation.brand': 'योजना सहायक',
    'navigation.tagline': 'सरकारी योजना इंटेलिजेंस',
    'navigation.home': 'होम',
    'navigation.schemes': 'सरकारी योजनाएं',
    'navigation.eligibility': 'पात्रता जांच',
    'navigation.compare': 'योजना तुलना',
    'navigation.chat': 'AI चैटबॉट (RAG)',
    'navigation.centreLocator': 'सेवा केंद्र खोजें',
    'navigation.app': 'नागरिक पोर्टल',
    'navigation.admin': 'एडमिन कंसोल',

    // Legacy nav mapped
    'brand.title': 'योजना सहायक',
    'brand.tagline': 'नागरिक कल्याण एवं प्रमाण-आधारित मार्गदर्शन',
    'nav.home': 'होम',
    'nav.howItWorks': 'यह कैसे काम करता है',
    'nav.schemes': 'सरकारी योजनाएं',
    'nav.compare': 'योजना तुलना',
    'nav.centreLocator': 'सेवा केंद्र खोजें',
    'nav.app': 'नागरिक पोर्टल',
    'nav.admin': 'प्रशासक कंसोल',
    'app.nav.overview': 'अवलोकन डैशबोर्ड',
    'app.nav.chat': 'एआई रोबोट (चैट)',
    'app.nav.discover': 'योजना खोजें',
    'app.nav.eligibility': 'पात्रता जांच',
    'app.nav.recommendations': 'अनुशंसित योजनाएं',
    'app.nav.saved': 'मेरी सहेजी योजनाएं',
    'app.nav.profile': 'मेरी प्रोफाइल',
    'app.nav.settings': 'सेटिंग्स व प्राथमिकताएं',

    // ---------------- DASHBOARD ----------------
    'dashboard.welcome': 'नमस्ते,',
    'dashboard.subtitle': 'आपका व्यक्तिगत सरकारी कल्याण एवं योजना विश्लेषण डैशबोर्ड',
    'dashboard.completeness': 'प्रोफ़ाइल पूर्णता',
    'dashboard.readiness': 'दस्तावेज़ तत्परता',
    'dashboard.checkEligibility': 'पात्रता जांचें',
    'dashboard.exploreRecs': 'अनुशंसित योजनाएं देखें',
    'dashboard.askAi': 'योजना एआई से पूछें',
    'dashboard.locateCentre': 'सेवा केंद्र खोजें',
    'dashboard.trackerTitle': 'मेरी आवेदन ट्रैकिंग',
    'dashboard.trackerSubtitle': 'अपने सरकारी योजना आवेदनों की प्रगति और महत्वपूर्ण तिथियों की निगरानी करें',
    'dashboard.addApplication': '+ नया आवेदन जोड़ें',
    'dashboard.noApplications': 'अभी तक कोई आवेदन ट्रैक नहीं किया गया है। ऊपर दिए गए बटन से जोड़ें।',
    'dashboard.activityTitle': 'हालिया गतिविधि',
    'dashboard.recommendationsTitle': 'आपके लिए शीर्ष अनुशंसित योजनाएं',
    'dashboard.viewAll': 'सभी देखें →',
    'dashboard.remindersTitle': 'आगामी अनुस्मारक व समय-सीमा',
    'dashboard.createReminder': '+ अनुस्मारक बनाएं',
    'dashboard.analyticsTitle': 'नागरिक विश्लेषिकी',

    // Stats
    'stat.matched': 'कुल मिलान योजनाएं',
    'stat.eligible': 'पात्र योजनाएं',
    'stat.saved': 'सहेजी गई योजनाएं',
    'stat.applied': 'ट्रैक किए गए आवेदन',
    'stat.pending': 'प्रक्रियाधीन आवेदन',
    'stat.approved': 'स्वीकृत आवेदन',
    'stat.missingDocs': 'अपूर्ण दस्तावेज़',
    'stat.upcomingReminders': 'आगामी अनुस्मारक',

    // ---------------- SCHEMES ----------------
    'schemes.catalogueTitle': 'सरकारी कल्याणकारी योजनाएं',
    'schemes.catalogueSub': 'सत्यापित मंत्रालय अधिसूचनाओं, राजपत्रों और परिचालन दिशानिर्देशों से संकलित अधिकृत योजनाएं।',
    'schemes.searchPlaceholder': 'योजना का नाम, मंत्रालय, लाभ या कीवर्ड खोजें...',
    'schemes.central': 'केंद्रीय योजनाएं',
    'schemes.state': 'राज्य स्तरीय योजनाएं',
    'schemes.categories': 'विषय श्रेणियां',
    'schemes.verifiedDocs': 'सत्यापित राजपत्र',
    'schemes.viewDetails': 'विवरण देखें',
    'schemes.checkEligibility': 'पात्रता जांचें',
    'schemes.officialPortal': 'आधिकारिक पोर्टल',
    'schemes.benefitsSummary': 'वित्तीय लाभ एवं सहायता',
    'schemes.guidelines': 'सत्यापित दिशानिर्देश',
    'schemes.filterCategory': 'श्रेणी फ़िल्टर',
    'schemes.filterLevel': 'स्तर फ़िल्टर',

    // ---------------- ELIGIBILITY ----------------
    'eligibility.title': '7-चरणीय स्वचालित पात्रता सत्यापन',
    'eligibility.subtitle': 'सत्यापित सरकारी राजपत्रों के आधार पर अपनी सटीक पात्रता की जांच करें।',
    'eligibility.step': 'चरण',
    'eligibility.matchedConditions': 'संतुष्ट शर्तें (Matched):',
    'eligibility.pendingConditions': 'जांच आवश्यक (Pending):',
    'eligibility.evaluateMyEligibility': 'मेरी पात्रता का मूल्यांकन करें',
    'eligibility.resultEligible': 'पात्र (Eligible)',
    'eligibility.resultLikely': 'संभावित पात्र (Likely Eligible)',
    'eligibility.resultIneligible': 'अपात्र (Not Eligible)',
    'eligibility.rulesActive': 'पात्रता नियम सक्रिय',

    // ---------------- CHATBOT ----------------
    'chatbot.title': 'योजना एआई — सत्यापित सरकारी मार्गदर्शक',
    'chatbot.subtitle': 'शून्य मतिभ्रम (Zero Hallucination) • बहुभाषी संवाद • प्रामाणिक गजट साक्ष्य',
    'chatbot.askPlaceholder': 'सरकारी योजना, पात्रता या किस्त संबंधी प्रश्न पूछें...',
    'chatbot.listen': 'सुनें (Audio)',
    'chatbot.stop': 'रोकें',
    'chatbot.pause': 'रोकें',
    'chatbot.resume': 'जारी रखें',
    'chatbot.copy': 'कॉपी',
    'chatbot.copied': 'कॉपी हुआ',
    'chatbot.helpful': 'उपयोगी उत्तर',
    'chatbot.unhelpful': 'अनुपयोगी उत्तर',
    'chatbot.evidenceNotice': 'सत्यापित उद्धरण (क्लिक करके विवरण देखें):',
    'chatbot.inspectPdf': 'पूर्ण आधिकारिक दस्तावेज़ पृष्ठ देखें',
    'chatbot.groundingRefusal': 'सत्यापन आश्वासन: आधिकारिक दिशानिर्देशों में इस प्रश्न के लिए कोई आधिकारिक प्रमाण नहीं मिला। मतिभ्रम रोकने हेतु उत्तर नहीं बनाया गया।',

    // ---------------- VOICE ----------------
    'voice.speakPrompt': 'बोलकर पूछें (आवाज़ पहचान)',
    'voice.listening': 'माइक सुन रहा है... बोलिए',
    'voice.transcribing': 'आवाज़ पहचानी जा रही है...',
    'voice.processing': 'सत्यापित दिशानिर्देशों में खोज हो रही है...',
    'voice.speaking': 'उत्तर पढ़ा जा रहा है...',
    'voice.stopListening': 'माइक बंद करें',
    'voice.cancel': 'रद्द करें',
    'voice.notSupported': 'आपके ब्राउज़र में आवाज़ पहचान समर्थित नहीं है। कृपया नीचे लिखकर पूछें।',
    'voice.permissionDenied': 'माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।',
    'voice.waveformCapturing': 'ऑडियो कैप्चर सक्रिय',

    // ---------------- PROFILE ----------------
    'profile.title': 'नागरिक प्रोफाइल एवं दस्तावेज़ तत्परता',
    'profile.subtitle': 'सटीक और पारदर्शी योजना सिफारिशों के लिए अपनी जानकारी और दस्तावेज़ सूची अद्यतित रखें।',
    'profile.personal': 'व्यक्तिगत जानकारी',
    'profile.occupation': 'व्यवसाय एवं रोजगार',
    'profile.financial': 'वित्तीय जानकारी',
    'profile.education': 'शैक्षणिक योग्यता',
    'profile.documents': 'मेरे दस्तावेज़ (My Documents)',
    'profile.fullName': 'पूरा नाम',
    'profile.age': 'आयु (वर्ष)',
    'profile.dob': 'जन्म तिथि',
    'profile.gender': 'लिंग',
    'profile.state': 'अधिवास राज्य (State)',
    'profile.district': 'जिला (District)',
    'profile.area': 'निवास क्षेत्र',
    'profile.marital': 'वैवाहिक स्थिति',
    'profile.socialCat': 'सामाजिक वर्ग',
    'profile.disability': 'दिव्यांगता स्थिति',
    'profile.income': 'पारिवारिक वार्षिक आय (₹)',
    'profile.incomeBand': 'वार्षिक आय वर्ग',
    'profile.bpl': 'बीपीएल राशन कार्ड धारक',
    'profile.hasIncomeCert': 'तहसीलदार आय प्रमाण पत्र उपलब्ध है',
    'profile.save': 'बदलाव सहेजें',
    'profile.saved': 'प्रोफ़ाइल सफलतापूर्वक सहेजी गई!',
    'profile.export': 'मेरी प्रोफाइल निर्यात करें',
    'profile.reset': 'प्रोफाइल रीसेट करें',

    // Documents
    'doc.available': 'उपलब्ध है',
    'doc.missing': 'अपूर्ण / अनुपलब्ध',
    'doc.not_applicable': 'लागू नहीं',
    'doc.not_sure': 'निश्चित नहीं',

    // ---------------- SETTINGS ----------------
    'settings.title': 'अनुप्रयोग सेटिंग्स',
    'settings.subtitle': 'थीम, भाषा, सूचनाएं, रोबोट साथी और डेटा गोपनीयता प्राथमिकताएं।',
    'settings.appearance': 'दिखावट एवं रंग थीम',
    'settings.language': 'भाषा चयन',
    'settings.notifications': 'सूचना एवं अनुस्मारक प्राथमिकताएं',
    'settings.voice': 'योजना एआई रोबोट साथी सेटिंग्स',
    'settings.accessibility': 'सुलभता एवं पहुंच (Accessibility)',
    'settings.privacy': 'डेटा प्रबंधन एवं गोपनीयता',
    'settings.dark': 'डार्क मोड (Dark Theme)',
    'settings.light': 'लाइट मोड (Light Theme)',
    'settings.system': 'सिस्टम डिफ़ॉल्ट',
    'settings.exportData': 'मेरा पूरा डेटा निर्यात करें (JSON)',
    'settings.deleteData': 'मेरा सभी स्थानीय डेटा मिटाएं',
    'settings.autoSpeak': 'उत्तर स्वतः आवाज़ में पढ़ें (Auto-speak)',
    'settings.speechRate': 'आवाज़ बोलने की गति',

    // ---------------- ADMIN ----------------
    'admin.title': 'प्रशासक सुरक्षा गेटवे',
    'admin.nav.overview': 'अवलोकन (Overview)',
    'admin.nav.sources': 'स्रोत रजिस्ट्री (Sources)',
    'admin.nav.discovery': 'स्वचालित खोज (Discovery)',
    'admin.nav.reviewQueue': 'समीक्षा कतार (Review Queue)',
    'admin.nav.documents': 'दस्तावेज़ संस्करण (Documents)',
    'admin.nav.rules': 'पात्रता नियम (Rules Engine)',
    'admin.nav.audit': 'ऑडिट लॉग (Audit Trail)',
    'admin.nav.freshness': 'ताज़गी एवं विश्लेषिकी',
    'admin.runNow': 'तुरंत खोज चलाएं (Run Now)',
    'admin.approve': 'स्वीकृत करें',
    'admin.reject': 'अस्वीकृत करें',
    'admin.singleScheduler': 'एकल शेड्यूलर प्रक्रिया सक्रिय',

    // ---------------- NOTIFICATIONS ----------------
    'notifications.title': 'मेरी सूचनाएं एवं अनुस्मारक',
    'notifications.empty': 'कोई नई सूचना नहीं है।',
    'notifications.markRead': 'पढ़ा गया चिह्नित करें',
    'notifications.create': 'नया अनुस्मारक बनाएं',

    // ---------------- VALIDATION ----------------
    'validation.required': 'यह फ़ील्ड अनिवार्य है।',
    'validation.invalidAge': 'कृपया मान्य आयु दर्ज करें (1-120)।',
    'validation.selectState': 'कृपया अपना अधिवास राज्य चुनें।',

    // ---------------- ERRORS ----------------
    'errors.generic': 'तकनीकी त्रुटि हुई। कृपया पुनः प्रयास करें।',
    'errors.network': 'इंटरनेट कनेक्शन उपलब्ध नहीं है। सहेजी गई योजनाएं ऑफ़लाइन मोड में उपलब्ध हैं।',
    'errors.notFound': 'अनुरोधित पृष्ठ या योजना नहीं मिली।'
  },
  en: {
    // ---------------- COMMON ----------------
    'common.save': 'Save',
    'common.saved': 'Saved',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.submit': 'Submit',
    'common.retry': 'Retry',
    'common.clear': 'Clear',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.loading': 'Loading...',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.all': 'All',
    'common.viewAll': 'View All →',
    'common.details': 'Details',
    'common.apply': 'Apply Now',
    'common.compare': 'Compare',
    'common.status': 'Status',
    'common.verified': 'Verified Evidence',
    'common.pending': 'Review Pending',
    'common.approved': 'Approved',
    'common.rejected': 'Rejected',
    'common.offline': 'Offline Mode Active',
    'common.online': 'Online Connected',

    // Legacy buttons mapped
    'btn.save': 'Save',
    'btn.saved': 'Saved',
    'btn.applyNow': 'Go to Official Portal',
    'btn.checkEligibility': 'Check Eligibility',
    'btn.retry': 'Retry',
    'btn.clear': 'Clear',
    'btn.submit': 'Submit',
    'btn.next': 'Next',
    'btn.back': 'Back',
    'btn.close': 'Close',
    'btn.cancel': 'Cancel',
    'btn.confirm': 'Confirm',

    // ---------------- NAVIGATION ----------------
    'navigation.brand': 'Yojana Sahayak',
    'navigation.tagline': 'Gov Scheme Intelligence',
    'navigation.home': 'Home',
    'navigation.schemes': 'Schemes Directory',
    'navigation.eligibility': 'Eligibility Check',
    'navigation.compare': 'Compare Schemes',
    'navigation.chat': 'AI Chatbot (RAG)',
    'navigation.centreLocator': 'Centre Locator',
    'navigation.app': 'Citizen App',
    'navigation.admin': 'Admin Console',

    // Legacy nav mapped
    'brand.title': 'Yojana Sahayak',
    'brand.tagline': 'Civic Welfare & Evidence-Grounded Guidance',
    'nav.home': 'Home',
    'nav.howItWorks': 'How It Works',
    'nav.schemes': 'Schemes Directory',
    'nav.compare': 'Compare Schemes',
    'nav.centreLocator': 'Centre Locator',
    'nav.app': 'Citizen App',
    'nav.admin': 'Admin Console',
    'app.nav.overview': 'Overview Dashboard',
    'app.nav.chat': 'AI Robot (Chat)',
    'app.nav.discover': 'Discover Schemes',
    'app.nav.eligibility': 'Eligibility Check',
    'app.nav.recommendations': 'Recommendations',
    'app.nav.saved': 'My Schemes',
    'app.nav.profile': 'My Profile',
    'app.nav.settings': 'Settings & Preferences',

    // ---------------- DASHBOARD ----------------
    'dashboard.welcome': 'Welcome back,',
    'dashboard.subtitle': 'Your personalized government scheme intelligence dashboard',
    'dashboard.completeness': 'Profile Completeness',
    'dashboard.readiness': 'Document Readiness',
    'dashboard.checkEligibility': 'Check My Eligibility',
    'dashboard.exploreRecs': 'Explore Recommended Schemes',
    'dashboard.askAi': 'Ask Yojana AI',
    'dashboard.locateCentre': 'Locate Seva Kendra',
    'dashboard.trackerTitle': 'My Application Tracker',
    'dashboard.trackerSubtitle': 'Monitor the progress and important dates for your government scheme applications',
    'dashboard.addApplication': '+ Track New Application',
    'dashboard.noApplications': 'No applications tracked yet. Click above to track a scheme.',
    'dashboard.activityTitle': 'Recent Activity',
    'dashboard.recommendationsTitle': 'Top Recommended Schemes For You',
    'dashboard.viewAll': 'View All →',
    'dashboard.remindersTitle': 'Upcoming Reminders & Deadlines',
    'dashboard.createReminder': '+ Create Reminder',
    'dashboard.analyticsTitle': 'Citizen Analytics',

    // Stats
    'stat.matched': 'Total Matched Schemes',
    'stat.eligible': 'Eligible Schemes',
    'stat.saved': 'Saved Schemes',
    'stat.applied': 'Tracked Applications',
    'stat.pending': 'Pending Applications',
    'stat.approved': 'Approved Applications',
    'stat.missingDocs': 'Missing Documents',
    'stat.upcomingReminders': 'Upcoming Reminders',

    // ---------------- SCHEMES ----------------
    'schemes.catalogueTitle': 'Government Welfare Schemes',
    'schemes.catalogueSub': 'Authoritative government schemes grounded in verified gazettes and operational guidelines.',
    'schemes.searchPlaceholder': 'Search by scheme name, ministry, benefits, or keywords...',
    'schemes.central': 'Central Schemes',
    'schemes.state': 'State Schemes',
    'schemes.categories': 'Categories',
    'schemes.verifiedDocs': 'Verified Gazettes',
    'schemes.viewDetails': 'View Details',
    'schemes.checkEligibility': 'Check Eligibility',
    'schemes.officialPortal': 'Official Portal',
    'schemes.benefitsSummary': 'Financial Benefits & Assistance',
    'schemes.guidelines': 'Verified Guidelines',
    'schemes.filterCategory': 'Filter Category',
    'schemes.filterLevel': 'Filter Level',

    // ---------------- ELIGIBILITY ----------------
    'eligibility.title': '7-Step Automated Eligibility Verification',
    'eligibility.subtitle': 'Verify your exact entitlement grounded in immutable statutory gazette rules.',
    'eligibility.step': 'Step',
    'eligibility.matchedConditions': 'Satisfied Conditions (Matched):',
    'eligibility.pendingConditions': 'Verification Required (Pending):',
    'eligibility.evaluateMyEligibility': 'Evaluate My Eligibility',
    'eligibility.resultEligible': 'Eligible',
    'eligibility.resultLikely': 'Likely Eligible',
    'eligibility.resultIneligible': 'Not Eligible',
    'eligibility.rulesActive': 'Eligibility Rules Active',

    // ---------------- CHATBOT ----------------
    'chatbot.title': 'Yojana AI — Grounded Scheme Advisor',
    'chatbot.subtitle': 'Zero Hallucination Mode • Dense + BM25 RRF • Official Gazette Evidence',
    'chatbot.askPlaceholder': 'Ask any question about welfare schemes, benefits, or criteria...',
    'chatbot.listen': 'Listen (Audio)',
    'chatbot.stop': 'Stop',
    'chatbot.pause': 'Pause',
    'chatbot.resume': 'Resume',
    'chatbot.copy': 'Copy',
    'chatbot.copied': 'Copied',
    'chatbot.helpful': 'Helpful',
    'chatbot.unhelpful': 'Not helpful',
    'chatbot.evidenceNotice': 'Verified Citations (Click to inspect source):',
    'chatbot.inspectPdf': 'Open Full PDF Highlight Viewer',
    'chatbot.groundingRefusal': 'Grounding Assurance: No evidentiary backing found in official guidelines. Refused to prevent hallucination.',

    // ---------------- VOICE ----------------
    'voice.speakPrompt': 'Speak with Voice (Speech Recognition)',
    'voice.listening': 'Microphone is listening... Speak now',
    'voice.transcribing': 'Transcribing speech...',
    'voice.processing': 'Searching verified guidelines...',
    'voice.speaking': 'Reading answer aloud...',
    'voice.stopListening': 'Stop Listening',
    'voice.cancel': 'Cancel',
    'voice.notSupported': 'Speech recognition is not supported in this browser. Please type your query below.',
    'voice.permissionDenied': 'Microphone access denied. Please allow microphone permissions in your browser.',
    'voice.waveformCapturing': 'Audio Capture Active',

    // ---------------- PROFILE ----------------
    'profile.title': 'Citizen Profile & Document Readiness',
    'profile.subtitle': 'Keep your personal details and document status updated for accurate scheme recommendations.',
    'profile.personal': 'Personal Information',
    'profile.occupation': 'Occupation & Employment',
    'profile.financial': 'Financial Information',
    'profile.education': 'Education Information',
    'profile.documents': 'My Documents',
    'profile.fullName': 'Full Name',
    'profile.age': 'Age (Years)',
    'profile.dob': 'Date of Birth',
    'profile.gender': 'Gender',
    'profile.state': 'State of Domicile',
    'profile.district': 'District',
    'profile.area': 'Residence Area',
    'profile.marital': 'Marital Status',
    'profile.socialCat': 'Social Category',
    'profile.disability': 'Disability Status',
    'profile.income': 'Annual Family Income (₹)',
    'profile.incomeBand': 'Annual Income Band',
    'profile.bpl': 'BPL Ration Card Holder',
    'profile.hasIncomeCert': 'Official Income Certificate Available',
    'profile.save': 'Save Changes',
    'profile.saved': 'Profile saved successfully!',
    'profile.export': 'Export My Profile',
    'profile.reset': 'Reset Profile',

    // Documents
    'doc.available': 'Available',
    'doc.missing': 'Missing',
    'doc.not_applicable': 'Not Applicable',
    'doc.not_sure': 'Not Sure',

    // ---------------- SETTINGS ----------------
    'settings.title': 'Application Settings',
    'settings.subtitle': 'Theme, language, notifications, AI companion, and privacy preferences.',
    'settings.appearance': 'Appearance & Theme',
    'settings.language': 'Language Preferences',
    'settings.notifications': 'Notification & Reminder Preferences',
    'settings.voice': 'Yojana AI Robot Companion Settings',
    'settings.accessibility': 'Accessibility',
    'settings.privacy': 'Data Management & Privacy',
    'settings.dark': 'Obsidian Dark',
    'settings.light': 'Paper Light',
    'settings.system': 'System Default',
    'settings.exportData': 'Export My Data (JSON)',
    'settings.deleteData': 'Delete My Local Data',
    'settings.autoSpeak': 'Automatically speak assistant responses',
    'settings.speechRate': 'Speech Reading Speed',

    // ---------------- ADMIN ----------------
    'admin.title': 'Admin Security Gateway',
    'admin.nav.overview': 'Overview',
    'admin.nav.sources': 'Source Registry',
    'admin.nav.discovery': 'Discovery Jobs',
    'admin.nav.reviewQueue': 'Review Queue',
    'admin.nav.documents': 'Document Versions',
    'admin.nav.rules': 'Rules Engine',
    'admin.nav.audit': 'Audit History',
    'admin.nav.freshness': 'Freshness & Analytics',
    'admin.runNow': 'Run Discovery Now',
    'admin.approve': 'Approve',
    'admin.reject': 'Reject',
    'admin.singleScheduler': 'Dedicated Single Scheduler Active',

    // ---------------- NOTIFICATIONS ----------------
    'notifications.title': 'My Notifications & Reminders',
    'notifications.empty': 'No new notifications.',
    'notifications.markRead': 'Mark as Read',
    'notifications.create': 'Create New Reminder',

    // ---------------- VALIDATION ----------------
    'validation.required': 'This field is required.',
    'validation.invalidAge': 'Please enter a valid age (1-120).',
    'validation.selectState': 'Please select your domicile state.',

    // ---------------- ERRORS ----------------
    'errors.generic': 'An error occurred. Please try again.',
    'errors.network': 'No internet connection. Saved schemes remain accessible offline.',
    'errors.notFound': 'Requested scheme or page not found.'
  }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'hi',
  setLanguage: () => {},
  t: (key: string) => key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'hi';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'hi' || saved === 'en') return saved;
    } catch (e) {}
    return 'hi'; // Default Hindi per Indian civic mandate
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      window.dispatchEvent(new Event('yojana_language_change'));
    } catch (e) {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Reactive listener across windows or settings
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && (saved === 'hi' || saved === 'en') && saved !== language) {
          setLanguageState(saved);
        }
      } catch (e) {}
    };
    window.addEventListener('yojana_language_change', handleStorageChange);
    return () => window.removeEventListener('yojana_language_change', handleStorageChange);
  }, [language]);

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || translations.en?.[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
