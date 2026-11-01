/**
 * Yojana AI Assistant Experience Overhaul — Complete Interactive Government Scheme Advisor
 *
 * Implements:
 * 1. Branded Assistant Identity using authentic official robot companion asset (/assistant-robot.jpg).
 * 2. Real Web Audio API Frequency Waveform & Speech-to-Text (STT) Capture.
 * 3. Robust Sentence-Queued Text-to-Speech (TTS) with Play, Pause, Resume, Stop, and Replay.
 * 4. Speed Rate controls (0.75x, 1x, 1.25x) & Auto-Speak toggle.
 * 5. Grounded Scheme Advisor with interactive scheme cards, eligibility assessment brief, and gazette citations.
 * 6. Dual-mode support (Compact Floating Bubble & Expanded / Fullscreen Window).
 * 7. 100% Light Mode & Dark Mode design token contrast consistency.
 * 8. Comprehensive Hindi and English translation with seamless runtime switching.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  X,
  Sparkles,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Bookmark,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  FileText,
  ShieldCheck,
  Pause,
  Play,
  Square,
  Info,
  ChevronRight,
  UserCheck,
  Sliders,
  RefreshCw
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCitizenStore } from '../../utils/citizenStore';
import { useAudioWaveform } from '../../hooks/useAudioWaveform';
import { PdfEvidenceViewerModal } from '../PdfEvidenceViewerModal';
import './RobotCompanion.css';

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface SchemeSummary {
  scheme_id: string;
  code: string;
  name_en: string;
  name_hi: string;
  category: string;
  ministry_or_dept?: string;
  benefits_summary_en?: string;
  benefits_summary_hi?: string;
  official_portal_url?: string;
}

interface EligibilityBrief {
  scheme_id: string;
  scheme_name: string;
  status: string;
  matched_criteria: string[];
  missing_criteria: string[];
  action_prompt: string;
}

interface CitationItem {
  id: string;
  title: string;
  page: number;
  scheme_id?: string;
  document_version_id?: string;
  ministry?: string;
  excerpt?: string;
  verification_status?: string;
  link: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  speechText?: string;
  navigation?: { path: string; label: string };
  suggestedQuestions?: string[];
  schemesFound?: SchemeSummary[];
  eligibilityBrief?: EligibilityBrief;
  citations?: CitationItem[];
  timestamp: string;
  feedback?: 'helpful' | 'unhelpful';
}

const STORAGE_KEY = 'yojana_assistant_conversation_v2';

export const RobotCompanion: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { settings, saveSettings } = useCitizenStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isHindi = language === 'hi';

  // Audio Waveform Hook
  const { isCapturing, audioLevels, startCapturing, stopCapturing } = useAudioWaveform();

  // Widget states
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [mode, setMode] = useState<'simple' | 'advanced'>(() => (settings as any)?.assistant_mode || 'simple');

  // Audio Playback Settings & State
  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => settings?.voice_auto_speak ?? true);
  const [speechRate, setSpeechRate] = useState<number>(() => settings?.voice_speech_rate || 1.0);
  const [showSpeedControls, setShowSpeedControls] = useState<boolean>(false);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Citation inspection modal
  const [selectedCitation, setSelectedCitation] = useState<CitationItem | null>(null);

  // Feedback & Copy Toasts
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Voice Input (STT)
  const [inputQuery, setInputQuery] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [speechLang, setSpeechLang] = useState<'hi-IN' | 'en-IN'>(isHindi ? 'hi-IN' : 'en-IN');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Sync speech language when global language changes
  useEffect(() => {
    setSpeechLang(isHindi ? 'hi-IN' : 'en-IN');
  }, [isHindi]);

  // Initial welcome message generator
  const getWelcomeMessage = (): Message => ({
    id: 'msg-welcome',
    role: 'assistant',
    content: isHindi
      ? `### नमस्ते! मैं **योजना एआई** हूँ — आपका आधिकारिक सरकारी कल्याण मार्गदर्शक।\n\nमैं आपको भारत सरकार एवं राज्य सरकारों की कल्याणकारी योजनाओं को खोजने, पात्रता नियमों को समझने, आवश्यक दस्तावेज जानने और सीधे आवेदन करने में सहायता करता हूँ।\n\nआप मुझसे बोलकर या लिखकर पूछ सकते हैं:`
      : `### Namaste! I am **Yojana AI** — your verified Government Welfare Advisor.\n\nI assist citizens in discovering central and state government schemes, checking eligibility rules, identifying mandatory documents, and navigating applications.\n\nFeel free to speak or type your question below:`,
    speechText: isHindi
      ? 'नमस्ते! मैं योजना एआई हूँ। आप मुझसे किसी भी सरकारी योजना, पात्रता नियमों और दस्तावेजों के बारे में पूछ सकते हैं।'
      : 'Namaste! I am Yojana AI. You can speak or type to ask about any government welfare scheme, eligibility rules, and required documents.',
    suggestedQuestions: isHindi
      ? [
          '🌾 किसान सम्मान निधि (PM-KISAN) की जानकारी दें',
          '🏥 आयुष्मान भारत में 5 लाख का इलाज कैसे मिलता है?',
          '📋 मेरी योजना पात्रता की जांच करें',
          '🎓 कॉलेज छात्रों के लिए छात्रवृत्ति योजनाएं',
          '📍 मेरे नज़दीकी जन सेवा केंद्र (CSC) कहाँ हैं?'
        ]
      : [
          '🌾 Tell me about PM-KISAN scheme for farmers',
          '🏥 How to get free treatment under Ayushman Bharat?',
          '📋 Check my government scheme eligibility',
          '🎓 Scholarships for college students',
          '📍 Where is the nearest CSC Seva Kendra?'
        ],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // Conversation history loaded from storage or default
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved assistant messages:', e);
    }
    return [getWelcomeMessage()];
  });

  // Save conversation history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save assistant conversation:', e);
    }
  }, [messages]);

  // Check online connectivity to backend
  useEffect(() => {
    const checkConnectivity = async () => {
      try {
        const res = await fetch('/health');
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 15000);
    return () => clearInterval(interval);
  }, []);

  // Initialize SpeechSynthesis and voice list
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      synthRef.current.onvoiceschanged = () => {
        synthRef.current?.getVoices();
      };
    }
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, assistantState]);

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = speechLang;

      rec.onstart = () => {
        setAssistantState('listening');
        setErrorMessage(null);
        stopSpeaking();
      };

      rec.onresult = (event: any) => {
        let currentInterim = '';
        let finalized = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalized += event.results[i][0].transcript + ' ';
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        if (finalized) {
          setInputQuery(prev => (prev ? `${prev.trim()} ${finalized.trim()}` : finalized.trim()));
        }
        setInterimTranscript(currentInterim);
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        stopCapturing();
        setAssistantState('idle');
        if (event.error === 'not-allowed') {
          setErrorMessage(
            isHindi
              ? 'माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन चालू करें या नीचे लिखकर पूछें।'
              : 'Microphone permission denied. Please allow microphone access or type below.'
          );
        } else if (event.error !== 'no-speech') {
          setErrorMessage(
            isHindi
              ? 'आवाज़ पहचान में रुकावट आई। कृपया पुनः प्रयास करें।'
              : 'Speech recognition error. Please try again.'
          );
        }
      };

      rec.onend = () => {
        // Stop audio capture gracefully, preserve transcribed input for user review/edit
        stopCapturing();
        setInterimTranscript('');
        if (assistantState === 'listening') {
          setAssistantState('idle');
        }
      };

      recognitionRef.current = rec;
    } catch (e) {
      console.warn('Speech recognition initialization error:', e);
    }
  }, [speechLang, isHindi]);

  // Robust Sentence-Queued Text-to-Speech Engine
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    speechQueueRef.current = [];
    setActiveSpeakingMsgId(null);
    setIsPaused(false);
    if (assistantState === 'speaking') {
      setAssistantState('idle');
    }
  };

  const speakMessage = (messageId: string, textToSpeak: string) => {
    if (!synthRef.current) {
      alert(isHindi ? 'ब्राउज़र में वॉयस आउटपुट समर्थित नहीं है।' : 'Text-to-speech is not supported in this browser.');
      return;
    }

    // Toggle pause/resume if already speaking this message
    if (activeSpeakingMsgId === messageId) {
      if (isPaused) {
        synthRef.current.resume();
        setIsPaused(false);
        setAssistantState('speaking');
      } else {
        synthRef.current.pause();
        setIsPaused(true);
        setAssistantState('idle');
      }
      return;
    }

    // Cancel existing speech
    synthRef.current.cancel();
    setActiveSpeakingMsgId(messageId);
    setIsPaused(false);
    setAssistantState('speaking');

    // Split text into clean sentences for Chromium reliability
    const sentences = textToSpeak
      .replace(/\[C\d+(?:,\s*C\d+)*\]/g, '')
      .replace(/[#*_`]/g, '')
      .split(/(?<=[.?!|।])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length === 0) {
      stopSpeaking();
      return;
    }

    speechQueueRef.current = [...sentences];

    const playNextSentence = () => {
      if (!synthRef.current || speechQueueRef.current.length === 0) {
        stopSpeaking();
        return;
      }

      const sentence = speechQueueRef.current.shift()!;
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = isHindi ? 'hi-IN' : 'en-IN';
      utterance.rate = speechRate;
      utterance.pitch = 1.0;

      // Select natural voice
      const voices = synthRef.current.getVoices();
      const targetLangPrefix = isHindi ? 'hi' : 'en';
      const matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetLangPrefix));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onend = () => {
        if (speechQueueRef.current.length > 0) {
          playNextSentence();
        } else {
          stopSpeaking();
        }
      };

      utterance.onerror = (e) => {
        console.warn('TTS sentence error:', e);
        stopSpeaking();
      };

      currentUtteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    };

    playNextSentence();
  };

  const replayMessage = (messageId: string, textToSpeak: string) => {
    stopSpeaking();
    setTimeout(() => {
      speakMessage(messageId, textToSpeak);
    }, 80);
  };

  // Start real microphone capture and speech recognition
  const startListening = async () => {
    stopSpeaking();
    setErrorMessage(null);
    setInterimTranscript('');

    const captureSuccess = await startCapturing();
    if (!recognitionRef.current) {
      setErrorMessage(
        isHindi
          ? 'इस ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है। कृपया नीचे लिखकर पूछें।'
          : 'Speech recognition is not supported in this browser. Please type below.'
      );
      stopCapturing();
      return;
    }

    try {
      recognitionRef.current.lang = speechLang;
      recognitionRef.current.start();
      setAssistantState('listening');
    } catch (err: any) {
      console.warn('Recognition start exception:', err);
      if (!captureSuccess) {
        setErrorMessage(
          isHindi
            ? 'माइक्रोफ़ोन एक्सेस विफल। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।'
            : 'Microphone access failed. Please enable permissions in your browser.'
        );
      }
    }
  };

  // Stop listening gracefully (optionally discard transcript)
  const stopListening = (keepQuery: boolean = true) => {
    stopCapturing();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setInterimTranscript('');
    setAssistantState('idle');
    if (!keepQuery) {
      setInputQuery('');
    }
  };

  // Speed Rate Change Handler
  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    saveSettings({ voice_speech_rate: newRate });
    setShowSpeedControls(false);
    if (activeSpeakingMsgId && synthRef.current) {
      const activeMsg = messages.find(m => m.id === activeSpeakingMsgId);
      if (activeMsg) {
        replayMessage(activeMsg.id, activeMsg.speechText || activeMsg.content);
      }
    }
  };

  // Auto-Speak Toggle
  const toggleAutoSpeak = () => {
    const nextVal = !autoSpeak;
    setAutoSpeak(nextVal);
    saveSettings({ voice_auto_speak: nextVal });
    if (!nextVal) {
      stopSpeaking();
    }
  };

  // Submit query to conversational API
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text) return;

    stopSpeaking();
    stopListening(true);
    setInputQuery('');
    setInterimTranscript('');
    setErrorMessage(null);

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setAssistantState('thinking');

    try {
      const historyPayload = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/v1/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language: language,
          mode: mode,
          history: historyPayload,
          current_path: location.pathname,
          user_identifier: 'citizen-default'
        })
      });

      if (!res.ok) {
        throw new Error(`Assistant error: ${res.statusText}`);
      }

      const json = await res.json();
      const replyData = json.data;

      const assistantMsg: Message = {
        id: `asst-${Date.now() + 1}`,
        role: 'assistant',
        content: replyData.reply,
        speechText: replyData.speech_text,
        navigation: replyData.navigation,
        suggestedQuestions: replyData.suggested_questions || [],
        schemesFound: replyData.schemes_found || [],
        eligibilityBrief: replyData.eligibility_brief || null,
        citations: replyData.citations || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
      setAssistantState('idle');

      // Auto-speak if enabled
      if (autoSpeak) {
        speakMessage(assistantMsg.id, replyData.speech_text || replyData.reply);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setAssistantState('error');
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: isHindi
          ? 'क्षमा करें, उत्तर प्राप्त करने में तकनीकी समस्या आई। कृपया पुनः प्रयास करें या नीचे दिए गए त्वरित प्रश्नों में से चुनें।'
          : 'I encountered an issue connecting to the official scheme intelligence engine. Please ask again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  // Reset conversation
  const handleResetConversation = () => {
    stopSpeaking();
    stopListening(false);
    const welcome = getWelcomeMessage();
    setMessages([welcome]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Copy message text
  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Record feedback (thumbs up / down)
  const handleFeedback = async (msgId: string, query: string, helpful: boolean) => {
    try {
      await fetch('/api/v1/assistant/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: msgId,
          query: query,
          helpful: helpful
        })
      });

      setMessages(prev =>
        prev.map(m => (m.id === msgId ? { ...m, feedback: helpful ? 'helpful' : 'unhelpful' } : m))
      );

      setFeedbackToast(isHindi ? 'प्रतिक्रिया दर्ज करने के लिए धन्यवाद!' : 'Thank you for your feedback!');
      setTimeout(() => setFeedbackToast(null), 2500);
    } catch (e) {
      console.warn('Feedback submission error:', e);
    }
  };

  // Save scheme bookmark directly from embedded card
  const handleSaveScheme = async (schemeId: string) => {
    try {
      const resp = await fetch('/api/v1/citizen/schemes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_identifier: 'citizen-default',
          scheme_id: schemeId
        })
      });
      if (resp.ok) {
        setFeedbackToast(isHindi ? 'योजना आपकी सहेजी गई सूची में जोड़ी गई!' : 'Scheme saved to your citizen profile!');
        setTimeout(() => setFeedbackToast(null), 3000);
      }
    } catch (e) {
      console.warn('Save scheme error:', e);
    }
  };

  // Extract latest suggested questions from most recent assistant turn
  const latestSuggestions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].suggestedQuestions && messages[i].suggestedQuestions!.length > 0) {
        return messages[i].suggestedQuestions!;
      }
    }
    return [
      isHindi ? '🌾 किसान सम्मान निधि (PM-KISAN)' : '🌾 Tell me about PM-KISAN',
      isHindi ? '📋 मेरी पात्रता जांचें' : '📋 Check my eligibility',
      isHindi ? '🎓 छात्रवृत्ति योजनाएं' : '🎓 Scholarship schemes',
      isHindi ? '📍 सेवा केंद्र खोजें' : '📍 Find nearest CSC Kendra'
    ];
  }, [messages, isHindi]);

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* FLOATING ACTION LAUNCHER (COMPACT MODE)                             */}
      {/* ------------------------------------------------------------------- */}
      {!isOpen && (
        <div
          className="yojana-robot-launcher"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99990,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {/* Attention Tooltip Bubble */}
          <div
            className="yojana-robot-bubble"
            onClick={() => setIsOpen(true)}
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
          >
            <Sparkles size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />
            <span>{isHindi ? 'योजना सहायता चाहिए? मुझसे पूछें!' : 'Need scheme guidance? Ask Yojana AI!'}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="yojana-robot-btn"
            style={{
              position: 'relative',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0f172a',
              border: '2.5px solid #10b981',
              boxShadow: '0 12px 30px rgba(0,0,0,0.35), 0 0 20px rgba(16,185,129,0.35)'
            }}
            aria-label="Open Yojana AI Assistant"
            title="Yojana AI Citizen Assistant"
          >
            {/* Pulsing Emerald Halo */}
            <span className="yojana-robot-btn-halo" />

            {/* Official Pixel Robot Companion Avatar */}
            <img
              src="/assistant-robot.jpg"
              alt="Yojana AI Robot"
              className="yojana-robot-avatar-img"
              style={{
                width: '52px',
                height: '52px',
                objectFit: 'contain',
                borderRadius: '50%',
                display: 'block'
              }}
            />

            {/* Live Online Badge */}
            <span
              className={`yojana-robot-status-dot ${
                isOnline ? 'yojana-robot-status-online' : 'yojana-robot-status-offline'
              }`}
            />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* EXPANDED ASSISTANT WINDOW                                           */}
      {/* ------------------------------------------------------------------- */}
      {isOpen && (
        <div
          className={`yojana-assistant-window ${isExpanded ? 'fullscreen' : ''}`}
          style={
            isExpanded
              ? {
                  position: 'fixed',
                  top: '16px',
                  left: '16px',
                  right: '16px',
                  bottom: '16px',
                  zIndex: 99995,
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--bg-surface-elevated, #ffffff)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)'
                }
              : {
                  position: 'fixed',
                  bottom: '24px',
                  right: '24px',
                  width: 'min(475px, calc(100vw - 32px))',
                  height: 'min(710px, calc(100vh - 48px))',
                  maxHeight: '820px',
                  zIndex: 99995,
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'var(--bg-surface-elevated, #ffffff)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)'
                }
          }
        >
          {/* HEADER */}
          <div className="yojana-assistant-header">
            {/* Assistant Identity */}
            <div className="yojana-assistant-identity">
              <div
                className={`yojana-assistant-avatar-box state-${assistantState}`}
                style={{ width: '40px', height: '40px', flexShrink: 0 }}
              >
                <img
                  src="/assistant-robot.jpg"
                  alt="Yojana AI"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                />
                <span
                  className={`yojana-robot-status-dot ${
                    isOnline ? 'yojana-robot-status-online' : 'yojana-robot-status-offline'
                  }`}
                  style={{ bottom: '-2px', right: '-2px', width: '10px', height: '10px' }}
                />
              </div>

              <div className="yojana-assistant-title-group">
                <div className="yojana-assistant-title-row">
                  <h3 className="yojana-assistant-title">Yojana AI</h3>
                  <span className="yojana-assistant-badge">GovTech RAG</span>
                </div>
                <p className="yojana-assistant-subtitle">
                  {assistantState === 'listening'
                    ? (isHindi ? '🎙️ आपकी आवाज़ सुन रहा हूँ...' : '🎙️ Listening to you...')
                    : assistantState === 'speaking'
                    ? (isHindi ? '🔊 उत्तर बोल रहा हूँ...' : '🔊 Speaking response...')
                    : assistantState === 'thinking'
                    ? (isHindi ? '⚡ सरकारी नियमों की जांच जारी है...' : '⚡ Searching official gazettes...')
                    : (isHindi ? 'आधिकारिक कल्याण साथी • ऑनलाइन' : 'Official Welfare Advisor • Online')}
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="yojana-assistant-header-controls">
              {/* Interaction Mode Switcher: Simple vs Advanced */}
              <button
                type="button"
                onClick={() => {
                  const nextMode = mode === 'simple' ? 'advanced' : 'simple';
                  setMode(nextMode);
                  saveSettings({ assistant_mode: nextMode } as any);
                }}
                className={`yojana-hdr-btn ${mode === 'advanced' ? 'active' : ''}`}
                title={
                  mode === 'simple'
                    ? (isHindi ? 'सरल मोड (नागरिक) — क्लिक करके उन्नत मोड में बदलें' : 'Simple Mode (Citizen) — Click to switch to Advanced Mode')
                    : (isHindi ? 'उन्नत मोड (विशेषज्ञ) — क्लिक करके सरल मोड में बदलें' : 'Advanced Mode (Specialist) — Click to switch to Simple Mode')
                }
              >
                <span>{mode === 'simple' ? '🌱' : '🔬'}</span>
                <span>{mode === 'simple' ? (isHindi ? 'सरल' : 'Simple') : (isHindi ? 'उन्नत' : 'Adv')}</span>
              </button>

              {/* Language Switch */}
              <button
                type="button"
                onClick={() => setLanguage(isHindi ? 'en' : 'hi')}
                className="yojana-hdr-btn"
                title={isHindi ? 'Switch to English' : 'हिंदी में बदलें'}
              >
                {isHindi ? 'EN' : 'हिन्दी'}
              </button>

              {/* Speed Rate Control Dropdown Toggle */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowSpeedControls(!showSpeedControls)}
                  className="yojana-hdr-btn"
                  title="Speech Playback Speed"
                >
                  <Sliders size={12} />
                  <span>{speechRate}x</span>
                </button>

                {showSpeedControls && (
                  <div className="yojana-speed-popup">
                    {[0.75, 1.0, 1.25].map(rate => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleRateChange(rate)}
                        className={`yojana-speed-item ${speechRate === rate ? 'active' : ''}`}
                      >
                        {rate}x {rate === 1.0 ? '(Normal)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Auto-Speak Toggle */}
              <button
                type="button"
                onClick={toggleAutoSpeak}
                className={`yojana-hdr-btn-icon ${autoSpeak ? 'active' : ''}`}
                style={{ color: autoSpeak ? '#10b981' : '#94a3b8' }}
                title={autoSpeak ? 'Auto-Speak ON (Click to disable)' : 'Auto-Speak OFF (Click to enable)'}
              >
                {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              {/* Reset Conversation */}
              <button
                type="button"
                onClick={handleResetConversation}
                className="yojana-hdr-btn-icon"
                title={isHindi ? 'वार्तालाप रीसेट करें' : 'Reset Conversation'}
              >
                <RotateCcw size={16} />
              </button>

              {/* Expand to Fullscreen Toggle */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="yojana-hdr-btn-icon"
                title={isExpanded ? 'Restore Size' : 'Expand Fullscreen'}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  stopListening(false);
                  setIsOpen(false);
                }}
                className="yojana-hdr-btn-icon"
                style={{ color: '#ef4444' }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* GLOBAL FEEDBACK TOAST */}
          {feedbackToast && (
            <div className="yojana-toast-banner">
              <CheckCircle2 size={14} />
              <span>{feedbackToast}</span>
            </div>
          )}

          {/* CONVERSATION MESSAGE STREAM */}
          <div className="yojana-assistant-messages">
            {messages.map(msg => {
              const isUser = msg.role === 'user';
              const isSpeakingThis = activeSpeakingMsgId === msg.id && !isPaused;

              return (
                <div
                  key={msg.id}
                  className={`yojana-msg-row ${isUser ? 'yojana-msg-user' : 'yojana-msg-assistant'}`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="yojana-msg-avatar">
                      <img
                        src="/assistant-robot.jpg"
                        alt="Yojana AI"
                      />
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '88%' }}>
                    <div className="yojana-msg-bubble">
                      {/* Markdown Structured Body */}
                      <div style={{ fontSize: '0.86rem', lineHeight: '1.6' }}>
                        {msg.content.split('\n\n').map((paragraph, pIdx) => {
                          if (paragraph.startsWith('### ')) {
                            return (
                              <h4 key={pIdx} style={{ fontWeight: 800, fontSize: '0.98rem', color: '#10b981', margin: '8px 0 4px' }}>
                                {paragraph.replace('### ', '')}
                              </h4>
                            );
                          }
                          if (paragraph.startsWith('|')) {
                            // Render Markdown Table
                            const rows = paragraph.split('\n').filter(r => r.includes('|') && !r.includes('---'));
                            return (
                              <div key={pIdx} style={{ overflowX: 'auto', margin: '8px 0' }}>
                                <table>
                                  <tbody>
                                    {rows.map((row, rIdx) => (
                                      <tr key={rIdx}>
                                        {row.split('|').filter(c => c.trim().length > 0).map((cell, cIdx) => (
                                          <td key={cIdx}>
                                            {cell.trim()}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          }
                          return (
                            <p key={pIdx} style={{ whiteSpace: 'pre-line', margin: '4px 0' }}>
                              {paragraph}
                            </p>
                          );
                        })}
                      </div>

                      {/* EMBEDDED INTERACTIVE SCHEME CARDS */}
                      {msg.schemesFound && msg.schemesFound.length > 0 && (
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Sparkles size={14} style={{ color: '#f59e0b' }} />
                            {isHindi ? 'प्रासंगिक सरकारी योजनाएं' : 'Matched Government Schemes'}
                          </span>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                            {msg.schemesFound.map(s => (
                              <div
                                key={s.scheme_id}
                                className="yojana-chat-scheme-card"
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                  <div>
                                    <h5 className="yojana-chat-scheme-title">
                                      {isHindi ? s.name_hi : s.name_en}
                                    </h5>
                                    {s.ministry_or_dept && (
                                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                        {s.ministry_or_dept}
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                    {s.category}
                                  </span>
                                </div>

                                {(s.benefits_summary_en || s.benefits_summary_hi) && (
                                  <p className="yojana-chat-scheme-desc">
                                    {isHindi ? s.benefits_summary_hi : s.benefits_summary_en}
                                  </p>
                                )}

                                {/* Interactive Action Buttons */}
                                <div className="yojana-chat-scheme-actions">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate(`/eligibility?scheme=${s.scheme_id}`);
                                    }}
                                    className="yojana-scheme-action-btn yojana-scheme-action-primary"
                                  >
                                    <UserCheck size={12} />
                                    {isHindi ? 'पात्रता जांचें' : 'Check Eligibility'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate(`/schemes/${s.scheme_id}`);
                                    }}
                                    className="yojana-scheme-action-btn yojana-scheme-action-secondary"
                                  >
                                    <Info size={12} />
                                    {isHindi ? 'विवरण' : 'Details'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleSaveScheme(s.scheme_id)}
                                    className="yojana-scheme-action-btn yojana-scheme-action-secondary"
                                    title="Save to My Profile"
                                  >
                                    <Bookmark size={12} />
                                  </button>

                                  {s.official_portal_url && (
                                    <a
                                      href={s.official_portal_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="yojana-scheme-action-btn yojana-scheme-action-secondary"
                                      style={{ marginLeft: 'auto' }}
                                    >
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* EMBEDDED ELIGIBILITY ADVISOR BRIEF */}
                      {msg.eligibilityBrief && (
                        <div className="yojana-chat-eligibility-box">
                          <div className="yojana-chat-eligibility-header">
                            <span className="yojana-chat-eligibility-title">
                              <ShieldCheck size={16} style={{ color: '#10b981' }} />
                              {isHindi ? 'प्रोफ़ाइल पात्रता विश्लेषण' : 'Citizen Eligibility Status'}
                            </span>
                            <span className="yojana-chat-eligibility-badge">
                              {msg.eligibilityBrief.status}
                            </span>
                          </div>

                          {msg.eligibilityBrief.matched_criteria.length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                                {isHindi ? 'संतुष्ट शर्तें (Matched):' : 'Satisfied Conditions:'}
                              </span>
                              {msg.eligibilityBrief.matched_criteria.map((c, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Check size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                                  <span>{c}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {msg.eligibilityBrief.missing_criteria.length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#f59e0b', display: 'flex', flexDirection: 'column', gap: '3px', paddingTop: '4px' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.68rem', textTransform: 'uppercase' }}>
                                {isHindi ? 'जांच आवश्यक (Pending):' : 'Verification Required:'}
                              </span>
                              {msg.eligibilityBrief.missing_criteria.map((m, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <AlertCircle size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                  <span>{m}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/eligibility?scheme=${msg.eligibilityBrief?.scheme_id}`);
                            }}
                            className="yojana-scheme-action-btn yojana-scheme-action-primary"
                            style={{ justifyContent: 'center', width: '100%', marginTop: '6px', padding: '6px 10px' }}
                          >
                            <UserCheck size={14} />
                            {isHindi ? 'आधिकारिक 7-चरणीय मूल्यांकन खोलें' : 'Launch Full 7-Step Evaluation'}
                          </button>
                        </div>
                      )}

                      {/* VERIFIED SOURCE CITATION CARDS */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="yojana-citations-container">
                          <span className="yojana-citations-title">
                            <FileText size={13} style={{ color: '#10b981' }} />
                            {isHindi ? 'सत्यापित आधिकारिक स्रोत एवं गजट' : 'Verified Official Gazette Citations'}
                          </span>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {msg.citations.map((cite, cIdx) => (
                              <div
                                key={cIdx}
                                onClick={() => setSelectedCitation(cite)}
                                className="yojana-citation-card"
                              >
                                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ padding: '1px 5px', fontSize: '0.65rem', fontWeight: 800, borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                      Page {cite.page}
                                    </span>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {cite.title}
                                    </span>
                                  </div>
                                  {cite.excerpt && (
                                    <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      "{cite.excerpt}"
                                    </p>
                                  )}
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                  {isHindi ? 'दस्तावेज़ देखें' : 'Inspect'} <ChevronRight size={13} />
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* NAVIGATION ACTION PILL */}
                      {msg.navigation && (
                        <div className="yojana-nav-pill-box">
                          <button
                            type="button"
                            onClick={() => {
                              setIsOpen(false);
                              navigate(msg.navigation!.path);
                            }}
                            className="yojana-nav-pill-btn"
                          >
                            <span>{msg.navigation.label}</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* MESSAGE FOOTER & ACTIONS */}
                    {!isUser && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', padding: '0 4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Audio Listen / Pause Button */}
                          <button
                            type="button"
                            onClick={() => speakMessage(msg.id, msg.speechText || msg.content)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.72rem',
                              border: isSpeakingThis ? '1px solid #10b981' : 'none',
                              background: isSpeakingThis ? 'rgba(16,185,129,0.15)' : 'transparent',
                              color: isSpeakingThis ? '#10b981' : 'inherit',
                              cursor: 'pointer'
                            }}
                            title="Listen to response aloud"
                          >
                            {isSpeakingThis ? <Pause size={12} /> : <Play size={12} />}
                            <span>{isSpeakingThis ? (isHindi ? 'रुकें' : 'Pause') : (isHindi ? 'सुनें' : 'Listen')}</span>
                          </button>

                          {/* Replay Audio Button */}
                          <button
                            type="button"
                            onClick={() => replayMessage(msg.id, msg.speechText || msg.content)}
                            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px' }}
                            title={isHindi ? 'शुरू से दोबारा सुनें' : 'Replay from start'}
                          >
                            <RotateCcw size={12} />
                          </button>

                          {/* Stop Audio Button if currently playing */}
                          {isSpeakingThis && (
                            <button
                              type="button"
                              onClick={stopSpeaking}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                              title="Stop audio playback"
                            >
                              <Square size={11} />
                              <span>{isHindi ? 'बंद करें' : 'Stop'}</span>
                            </button>
                          )}

                          {/* Copy Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
                            title="Copy response text"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check size={12} style={{ color: '#10b981' }} />
                                <span style={{ color: '#10b981', fontWeight: 700 }}>{isHindi ? 'कॉपी हो गया' : 'Copied'}</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>{isHindi ? 'कॉपी' : 'Copy'}</span>
                              </>
                            )}
                          </button>

                          {/* Feedback Thumbs */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid rgba(0,0,0,0.1)', paddingLeft: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleFeedback(msg.id, msg.content, true)}
                              style={{ background: 'transparent', border: 'none', color: msg.feedback === 'helpful' ? '#10b981' : '#94a3b8', cursor: 'pointer', padding: '2px' }}
                              title="Helpful response"
                            >
                              <ThumbsUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFeedback(msg.id, msg.content, false)}
                              style={{ background: 'transparent', border: 'none', color: msg.feedback === 'unhelpful' ? '#ef4444' : '#94a3b8', cursor: 'pointer', padding: '2px' }}
                              title="Unhelpful response"
                            >
                              <ThumbsDown size={12} />
                            </button>
                          </div>
                        </div>

                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{msg.timestamp}</span>
                      </div>
                    )}

                    {isUser && (
                      <div style={{ textAlign: 'right', fontSize: '0.68rem', color: '#94a3b8', padding: '0 4px' }}>
                        {msg.timestamp}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* THINKING LIVE INDICATOR */}
            {assistantState === 'thinking' && (
              <div className="yojana-thinking-indicator">
                <div className="yojana-msg-avatar">
                  <img src="/assistant-robot.jpg" alt="Yojana AI" />
                </div>
                <div className="yojana-thinking-bubble">
                  <div className="yojana-thinking-dots">
                    <span className="yojana-thinking-dot" />
                    <span className="yojana-thinking-dot" />
                    <span className="yojana-thinking-dot" />
                  </div>
                  <span>{isHindi ? 'आधिकारिक गजट एवं नियमों का विश्लेषण...' : 'Grounding with official guidelines...'}</span>
                </div>
              </div>
            )}

            {/* LIVE VOICE RECORDING & WAVEFORM DISPLAY */}
            {assistantState === 'listening' && (
              <div className="yojana-live-waveform-panel">
                <div className="yojana-waveform-header">
                  <div className="yojana-waveform-indicator">
                    <span className="yojana-waveform-dot" />
                    <span>{isHindi ? 'माइक सक्रिय (सुन रहा है...)' : 'Microphone Live (Listening...)'}</span>
                  </div>

                  {/* Frequency Waveform Visualizer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '24px', padding: '2px 8px', background: '#090d16', borderRadius: '9999px', border: '1px solid rgba(16,185,129,0.3)' }}>
                    {audioLevels.map((lvl, idx) => (
                      <span
                        key={idx}
                        style={{ width: '3px', height: `${lvl}px`, background: '#10b981', borderRadius: '9999px', transition: 'height 75ms ease' }}
                      />
                    ))}
                  </div>

                  {/* Speech Language Switcher Badge */}
                  <button
                    type="button"
                    onClick={() => setSpeechLang(speechLang === 'hi-IN' ? 'en-IN' : 'hi-IN')}
                    style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', cursor: 'pointer' }}
                    title="Toggle Speech Recognition Language"
                  >
                    {speechLang === 'hi-IN' ? 'HI-IN' : 'EN-IN'}
                  </button>
                </div>

                {/* Real-time transcribed text preview */}
                <div className="yojana-transcript-box">
                  {interimTranscript || inputQuery ? (
                    <span>"{inputQuery ? inputQuery + ' ' : ''}{interimTranscript}"</span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>
                      {isHindi ? 'कृपया स्पष्ट आवाज़ में बोलें...' : 'Please speak clearly into your microphone...'}
                    </span>
                  )}
                </div>

                {/* Voice Action Controls: Cancel, Keep/Edit, Send */}
                <div className="yojana-waveform-actions">
                  <button
                    type="button"
                    onClick={() => stopListening(false)}
                    style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <X size={13} />
                    <span>{isHindi ? 'रद्द करें' : 'Cancel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => stopListening(true)}
                    style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    title={isHindi ? 'माइक बंद कर संपादन करें' : 'Stop mic and edit text'}
                  >
                    <Check size={13} />
                    <span>{isHindi ? 'सहेजें (Edit)' : 'Done (Edit)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputQuery.trim() && !interimTranscript.trim()}
                    style={{ padding: '4px 12px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '6px', border: 'none', background: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px', cursor: (!inputQuery.trim() && !interimTranscript.trim()) ? 'not-allowed' : 'pointer', opacity: (!inputQuery.trim() && !interimTranscript.trim()) ? 0.4 : 1 }}
                  >
                    <Send size={13} />
                    <span>{isHindi ? 'तुरंत भेजें' : 'Send Now'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ERROR TOAST */}
            {errorMessage && (
              <div className="yojana-error-banner">
                <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* DYNAMIC SUGGESTED QUESTION CHIPS */}
          {latestSuggestions.length > 0 && (
            <div className="yojana-quick-prompts">
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', flexShrink: 0, paddingLeft: '8px' }}>
                {isHindi ? 'सुझाव:' : 'Suggested:'}
              </span>
              {latestSuggestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(q)}
                  className="yojana-quick-pill"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* INPUT BAR */}
          <div className="yojana-assistant-footer">
            <div className="yojana-input-row">
              {/* Voice Input Microphone Button */}
              <button
                type="button"
                onClick={() => {
                  if (assistantState === 'listening') {
                    stopListening(true);
                  } else {
                    startListening();
                  }
                }}
                className="yojana-mic-btn"
                style={{
                  background: assistantState === 'listening' ? '#ef4444' : undefined,
                  color: assistantState === 'listening' ? '#ffffff' : undefined,
                  borderColor: assistantState === 'listening' ? '#ef4444' : undefined,
                }}
                title={assistantState === 'listening' ? 'Stop Listening' : 'Speak your query'}
              >
                {assistantState === 'listening' ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputQuery}
                onChange={e => {
                  stopSpeaking();
                  setInputQuery(e.target.value);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  isHindi
                    ? 'योजना, पात्रता, या दस्तावेज़ के बारे में पूछें...'
                    : 'Ask about any scheme, eligibility, or documents...'
                }
                className="yojana-input-field"
              />

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || assistantState === 'thinking'}
                className="yojana-send-btn"
                title="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}\n\n      {/* ------------------------------------------------------------------- */}
      {/* SOURCE CITATION INSPECTION MODAL (PDF EVIDENCE)                     */}
      {/* ------------------------------------------------------------------- */}
      {selectedCitation && (
        <PdfEvidenceViewerModal
          versionId={selectedCitation.document_version_id || selectedCitation.id || 'ver-pm_kisan-ae82cac8'}
          initialPage={selectedCitation.page || 1}
          documentTitle={selectedCitation.title}
          quoteSnippet={selectedCitation.excerpt}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </>
  );
};
