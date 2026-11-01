/**
 * Real-Time Microphone Web Audio API Waveform Hook
 * Captures live microphone input via MediaStream, AnalyserNode and returns
 * authentic frequency amplitude levels for visual waveform rendering.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useAudioWaveform() {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([6, 10, 14, 8, 12, 6, 9, 7]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startCapturing = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        return false;
      }

      // Stop any existing session
      stopCapturing();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      setIsCapturing(true);

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Extract 8 representative frequency bars (scaled between 4px and 28px)
        const bars: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / 8));
        for (let i = 0; i < 8; i++) {
          const val = dataArray[i * step] || 0;
          const height = Math.max(4, Math.min(28, Math.round((val / 255) * 24 + 4)));
          bars.push(height);
        }
        setAudioLevels(bars);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
      return true;
    } catch (err) {
      console.warn('Real Web Audio microphone capture error:', err);
      setIsCapturing(false);
      return false;
    }
  }, []);

  const stopCapturing = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsCapturing(false);
    setAudioLevels([6, 10, 14, 8, 12, 6, 9, 7]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapturing();
    };
  }, [stopCapturing]);

  return { isCapturing, audioLevels, startCapturing, stopCapturing };
}

