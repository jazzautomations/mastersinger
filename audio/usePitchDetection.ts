import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPitchYin } from '../audio/yin';
import { PitchSmoother } from '../audio/pitchSmoothing';
import { frequencyToMidi, midiToNoteName, midiToCents } from '../services/theoryService';
import type { PitchFrame } from '../types';

interface UsePitchDetectionOptions {
  a4?: number;
  bufferSize?: number;       // analysis window size (samples, must be power of 2)
  minFreq?: number;
  maxFreq?: number;
  threshold?: number;        // YIN threshold
  smoothing?: boolean;       // apply temporal smoothing (default true)
  onFrame?: (frame: PitchFrame) => void;
}

interface UsePitchDetectionReturn {
  isListening: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  currentFrame: PitchFrame | null;
  micLevel: number;          // 0..1 instantaneous RMS
  audioContext: AudioContext | null;
}

// 4096 gives YIN a comfortable window for low male voices (~80 Hz) and
// better SNR than 2048, at ~93 ms latency — fine for a tuner / practice.
const DEFAULT_BUFFER_SIZE = 4096;

export function usePitchDetection(options: UsePitchDetectionOptions = {}): UsePitchDetectionReturn {
  const {
    a4 = 440,
    bufferSize = DEFAULT_BUFFER_SIZE,
    minFreq = 70,
    maxFreq = 1200,
    threshold = 0.12,
    smoothing = true,
    onFrame,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState<PitchFrame | null>(null);
  const [micLevel, setMicLevel] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array>(new Float32Array(bufferSize));
  const startTimeRef = useRef<number>(0);
  const smootherRef = useRef<PitchSmoother>(new PitchSmoother({ a4 }));
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  // keep smoother a4 in sync if the user changes tuning reference
  useEffect(() => {
    if (smoothing) smootherRef.current = new PitchSmoother({ a4 });
  }, [a4, smoothing]);

  const processFrame = useCallback(() => {
    if (!analyserRef.current) return;

    analyserRef.current.getFloatTimeDomainData(bufferRef.current);

    const result = detectPitchYin(
      bufferRef.current,
      audioContextRef.current?.sampleRate ?? 44100,
      threshold,
      minFreq,
      maxFreq,
    );

    setMicLevel(result.rms);

    const ts = performance.now() - startTimeRef.current;

    if (smoothing) {
      const smooth = smootherRef.current.push({
        frequency: result.frequency,
        confidence: result.confidence,
      });
      if (smooth.voiced) {
        const nearestMidi = Math.round(smooth.midi);
        const frame: PitchFrame = {
          frequency: smooth.frequency,
          confidence: smooth.confidence,
          cents: smooth.cents,
          midi: smooth.midi,
          noteName: midiToNoteName(nearestMidi),
          octave: Math.floor(nearestMidi / 12) - 1,
          timestamp: ts,
        };
        setCurrentFrame(frame);
        onFrameRef.current?.(frame);
      } else {
        setCurrentFrame(prev => prev
          ? { ...prev, frequency: 0, confidence: 0, cents: 0, midi: 0, timestamp: ts }
          : null);
      }
    } else {
      // raw path (kept for tests / opt-out)
      if (result.frequency > 0 && result.confidence > 0.5) {
        const midi = frequencyToMidi(result.frequency, a4);
        const nearestMidi = Math.round(midi);
        const cents = midiToCents(result.frequency, a4);
        const frame: PitchFrame = {
          frequency: result.frequency,
          confidence: result.confidence,
          cents,
          midi,
          noteName: midiToNoteName(nearestMidi),
          octave: Math.floor(nearestMidi / 12) - 1,
          timestamp: ts,
        };
        setCurrentFrame(frame);
        onFrameRef.current?.(frame);
      } else {
        setCurrentFrame(prev => prev
          ? { ...prev, frequency: 0, confidence: 0, cents: 0, midi: 0, timestamp: ts }
          : null);
      }
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, [a4, threshold, minFreq, maxFreq, smoothing]);

  const start = useCallback(async () => {
    if (isListening) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = bufferSize;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      analyserRef.current = analyser;

      if (smoothing) smootherRef.current.reset();
      startTimeRef.current = performance.now();
      setIsListening(true);
      rafRef.current = requestAnimationFrame(processFrame);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err?.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access in your browser settings.');
      } else if (err?.name === 'NotFoundError') {
        setError('No microphone found. Connect one and try again.');
      } else {
        setError(err?.message ?? 'Failed to access microphone.');
      }
      setIsListening(false);
    }
  }, [isListening, bufferSize, processFrame, smoothing]);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (smoothing) smootherRef.current.reset();
    setIsListening(false);
    setCurrentFrame(null);
    setMicLevel(0);
  }, [smoothing]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    isListening,
    error,
    start,
    stop,
    currentFrame,
    micLevel,
    audioContext: audioContextRef.current,
  };
}
