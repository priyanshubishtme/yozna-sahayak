/**
 * Bilingual Voice Assistant with Web Speech Recognition, Speech Synthesis,
 * and Graceful Text Fallback (Phase 9 & Blueprint Section 11)
 *
 * Guarantees:
 * - Speech-to-text in Hindi (hi-IN) and English (en-IN).
 * - Live transcript preview with waveform animation indicator.
 * - Text input fallback if Web Speech API is unsupported or microphone access is denied.
 * - Hands-free voice querying linked to Grounded RAG Chat.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const VoiceAssistant: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [fallbackInput, setFallbackInput] = useState<string>('');
  const [hasSpeechSupport, setHasSpeechSupport] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Check Web Speech API availability
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasSpeechSupport(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let current = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          current += event.results[i][0].transcript;
        }
        setTranscript(current);
        setFallbackInput(current);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setErrorMessage(
            language === 'hi'
              ? 'माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया नीचे लिखकर पूछें।'
              : 'Microphone permission denied. Please type below.'
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      setHasSpeechSupport(false);
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setErrorMessage(null);
      try {
        recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Could not start recognition:', err);
      }
    }
  };

  const handleSendToChat = () => {
    const q = (transcript || fallbackInput).trim();
    if (!q) return;

    setIsOpen(false);
    setIsListening(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    // Navigate to Chat and pass initial voice query
    navigate('/app/chat', { state: { voiceQuery: q } });
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.5rem'
      }}
    >
      {isOpen && (
        <div
          className="glass-card"
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            width: '320px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-normal)',
            background: 'var(--bg-surface-elevated)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Volume2 size={18} style={{ color: 'var(--accent-saffron)' }} />
              <span>{language === 'hi' ? 'द्विभाषी आवाज़ सहायक' : 'Bilingual Voice Assistant'}</span>
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                if (isListening && recognitionRef.current) recognitionRef.current.stop();
              }}
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px', minWidth: 'auto' }}
            >
              <X size={15} />
            </button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            {language === 'hi'
              ? 'हिंदी या अंग्रेज़ी में बोलें। यह सीधे सत्यापित सरकारी नियमों से उत्तर खोजेगा।'
              : 'Speak in Hindi or English. Grounded answers retrieved strictly from verified rules.'}
          </p>

          {/* Error Message Callout */}
          {errorMessage && (
            <div
              style={{
                fontSize: '0.72rem',
                color: 'var(--accent-danger)',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <AlertCircle size={13} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Voice Microphone Control or Text Fallback */}
          {hasSpeechSupport ? (
            <div>
              <button
                type="button"
                onClick={toggleListening}
                className={`btn ${isListening ? 'btn-danger' : 'btn-primary'}`}
                style={{
                  width: '100%',
                  fontSize: '0.82rem',
                  padding: '0.6rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  boxShadow: isListening ? '0 0 15px rgba(239, 68, 68, 0.4)' : undefined
                }}
              >
                {isListening ? (
                  <>
                    <MicOff size={16} />
                    <span>{language === 'hi' ? 'सुनना बंद करें' : 'Stop Listening'}</span>
                  </>
                ) : (
                  <>
                    <Mic size={16} />
                    <span>
                      {language === 'hi'
                        ? 'माइक से बोलें (हिंदी/अंग्रेजी)'
                        : 'Start Voice Query (Hindi/English)'}
                    </span>
                  </>
                )}
              </button>

              {/* Live Waveform Indicator when Listening */}
              {isListening && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    height: '24px',
                    margin: '0.5rem 0'
                  }}
                >
                  <span className="animate-pulse" style={{ width: '4px', height: '14px', background: 'var(--accent-saffron)', borderRadius: '2px' }} />
                  <span className="animate-pulse" style={{ width: '4px', height: '22px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
                  <span className="animate-pulse" style={{ width: '4px', height: '18px', background: 'var(--accent-emerald)', borderRadius: '2px' }} />
                  <span className="animate-pulse" style={{ width: '4px', height: '10px', background: 'var(--accent-saffron)', borderRadius: '2px' }} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {language === 'hi'
                ? 'इस ब्राउज़र में स्पीच रिकग्निशन समर्थित नहीं है। नीचे लिखकर पूछें:'
                : 'Speech recognition not supported in this browser. Use text input below:'}
            </div>
          )}

          {/* Transcript / Text Input Fallback Box */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={fallbackInput}
              onChange={(e) => setFallbackInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendToChat()}
              placeholder={
                language === 'hi'
                  ? 'प्रश्न बोलें या यहां लिखें...'
                  : 'Speak question or type here...'
              }
              style={{
                flex: 1,
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-normal)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            <button
              onClick={handleSendToChat}
              disabled={!fallbackInput.trim() && !transcript.trim()}
              className="btn btn-primary btn-sm"
              style={{ padding: '0.45rem 0.75rem' }}
              title="Search in Grounded Chat"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: 'var(--radius-full)',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-saffron))',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          transition: 'transform var(--transition-fast)'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
        title={language === 'hi' ? 'आवाज़ सहायक खोलें' : 'Open Voice Assistant'}
      >
        <Mic size={22} />
      </button>
    </div>
  );
};
