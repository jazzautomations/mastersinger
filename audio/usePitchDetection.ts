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
  minConfidence?: number;    // smoother voiced gate (default 0.30)
  record?: boolean;          // also capture raw audio for playback (default false)
  onFrame?: (frame: PitchFrame) => void;
  // ── Audio tuning settings ──
  micSensitivity?: number;   // 0.0..1.0, higher = more sensitive
  noiseGate?: number;        // 0.0..0.1, RMS below this = silence
}

interface UsePitchDetectionReturn {
  isListening: boolean;
  isRecording: boolean;      // true while MediaRecorder is capturing
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  currentFrame: PitchFrame | null;
  micLevel: number;          // 0..1 instantaneous RMS
  audioContext: AudioContext | null;
  micStream: MediaStream | null;
  recordingUrl: string | null;   // object URL of last recording (or null)
  recordingDurationMs: number;   // length of last recording
  clearRecording: () => void;    // revoke the URL + reset
}

// 4096 gives YIN a comfortable window for low male voices (~80 Hz) and
// better SNR than 2048, at ~93 ms latency — fine for a tuner / practice.
const DEFAULT_BUFFER_SIZE = 4096;

export function usePitchDetection(options: UsePitchDetectionOptions = {}): UsePitchDetectionReturn {
  const {
    a4 = 440,
    bufferSize = DEFAULT_BUFFER_SIZE,
    minFreq = 60,        // lowered from 70 → catches bass/baritone lows (C2=65.4Hz)
    maxFreq = 1200,
    threshold = 0.15,    // raised from 0.12 → less noise-triggering on cheap mics
    smoothing = true,
    minConfidence = 0.30, // lowered from 0.45 → keeps needle alive on imperfect mics
    record = false,
    onFrame,
    micSensitivity = 0.5, // default balanced sensitivity
    noiseGate = 0.02,     // default low noise gate
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState<PitchFrame | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array>(new Float32Array(bufferSize));
  // Re-create the analysis buffer if bufferSize changes at runtime
  useEffect(() => {
    bufferRef.current = new Float32Array(bufferSize);
    if (analyserRef.current) analyserRef.current.fftSize = bufferSize;
  }, [bufferSize]);
  const startTimeRef = useRef<number>(0);
  const smootherRef = useRef<PitchSmoother>(new PitchSmoother(minConfidence != null ? { a4, minConfidence } : { a4 }));
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const lastVoicedRef = useRef<PitchFrame | null>(null);
  const voicedStreakRef = useRef(0);
  const silentStreakRef = useRef(0);
  const lastEmitTsRef = useRef(0);

  // Live-config refs (Fix 1): processFrame reschedules itself via RAF, so it
  // captures a4/threshold/minFreq/maxFreq/smoothing in its closure. When those
  // changed via deps, the OLD loop kept running with stale values. Reading
  // from refs keeps the running loop always current without restarting it.
  const a4Ref = useRef(a4); a4Ref.current = a4;
  const thresholdRef = useRef(threshold); thresholdRef.current = threshold;
  const minFreqRef = useRef(minFreq); minFreqRef.current = minFreq;
  const maxFreqRef = useRef(maxFreq); maxFreqRef.current = maxFreq;
  const smoothingRef = useRef(smoothing); smoothingRef.current = smoothing;
  const sensitivityRef = useRef(micSensitivity); sensitivityRef.current = micSensitivity;
  const noiseGateRef = useRef(noiseGate); noiseGateRef.current = noiseGate;
  // Guards start() against a double-click racing the awaited getUserMedia
  // (Fix 2): isListening is state and only flips AFTER the await, so two fast
  // taps both passed the old `if (isListening)` guard and opened two mic
  // streams. startingRef flips before the await.
  const startingRef = useRef(false);

  // ── Recording (MediaRecorder) ──
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordRef = useRef<boolean>(record);
  recordRef.current = record;

  // keep smoother a4 in sync if the user changes tuning reference
  useEffect(() => {
    if (smoothing) smootherRef.current = new PitchSmoother(minConfidence != null ? { a4, minConfidence } : { a4 });
  }, [a4, smoothing, minConfidence]);

  const processFrame = useCallback(() => {
    if (!analyserRef.current) return;

    analyserRef.current.getFloatTimeDomainData(bufferRef.current);

    // Apply noise gate: if RMS is below threshold, treat as silence
    let sum = 0;
    for (let i = 0; i < bufferRef.current.length; i++) sum += bufferRef.current[i] * bufferRef.current[i];
    const rms = Math.sqrt(sum / bufferRef.current.length);
    
    if (rms < noiseGateRef.current) {
      setMicLevel(0);
      silentStreakRef.current += 1;
      voicedStreakRef.current = 0;
      if (lastVoicedRef.current && silentStreakRef.current <= 2 && (performance.now() - startTimeRef.current - lastEmitTsRef.current) < 120) {
        setCurrentFrame(lastVoicedRef.current);
      } else {
        setCurrentFrame(prev => prev ? { ...prev, frequency: 0, confidence: 0, cents: 0, midi: 0, timestamp: performance.now() - startTimeRef.current } : null);
      }
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Apply sensitivity: scale the buffer by micSensitivity
    const sensitivity = sensitivityRef.current;
    if (sensitivity !== 1.0) {
      for (let i = 0; i < bufferRef.current.length; i++) {
        bufferRef.current[i] *= sensitivity;
      }
    }

    const result = detectPitchYin(
      bufferRef.current,
      audioContextRef.current?.sampleRate ?? 44100,
      thresholdRef.current,
      minFreqRef.current,
      maxFreqRef.current,
    );

    setMicLevel(result.rms);

    const ts = performance.now() - startTimeRef.current;
    const a4 = a4Ref.current;
    const emitFrame = (frame: PitchFrame | null) => {
      if (frame) {
        lastVoicedRef.current = frame;
        lastEmitTsRef.current = ts;
        setCurrentFrame(frame);
        onFrameRef.current?.(frame);
      } else {
        setCurrentFrame(prev => prev
          ? { ...prev, frequency: 0, confidence: 0, cents: 0, midi: 0, timestamp: ts }
          : null);
      }
    };

    if (smoothingRef.current) {
      const smooth = smootherRef.current.push({
        frequency: result.frequency,
        confidence: result.confidence,
      });
      if (smooth.voiced) {
        voicedStreakRef.current += 1;
        silentStreakRef.current = 0;
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
        emitFrame(frame);
      } else {
        silentStreakRef.current += 1;
        voicedStreakRef.current = 0;
        if (lastVoicedRef.current && silentStreakRef.current <= 2 && ts - lastEmitTsRef.current < 120) {
          emitFrame(lastVoicedRef.current);
        } else {
          emitFrame(null);
        }
      }
    } else {
      // raw path (smoothing disabled) — used by the Melody Studio so note
      // timestamps stay aligned with real time. Lower the confidence gate so
      // soft/edge-of-voiced frames still reach the transcriber, which then
      // applies its own median filter + segmentation. A higher gate here
      // would drop the attack and tail of every sung note.
      if (result.frequency > 0 && result.confidence > 0.3) {
        voicedStreakRef.current += 1;
        silentStreakRef.current = 0;
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
        emitFrame(frame);
      } else {
        silentStreakRef.current += 1;
        voicedStreakRef.current = 0;
        if (lastVoicedRef.current && silentStreakRef.current <= 2 && ts - lastEmitTsRef.current < 120) {
          emitFrame(lastVoicedRef.current);
        } else {
          emitFrame(null);
        }
      }
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, []);

  const start = useCallback(async () => {
    if (startingRef.current || isListening) return;
    startingRef.current = true;
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

      if (smoothingRef.current) smootherRef.current.reset();
      startTimeRef.current = performance.now();
      setIsListening(true);
      rafRef.current = requestAnimationFrame(processFrame);

      // ── Start raw-audio recording if requested. We grab the SAME stream the
      //    analyser uses, so the user hears exactly what was captured. Pick the
      //    best-supported mime type; fall back to the browser default. ──
      if (recordRef.current && 'MediaRecorder' in window) {
        recordedChunksRef.current = [];
        try {
          const candidates = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
          ];
          let mimeType: string | undefined;
          for (const c of candidates) {
            if (MediaRecorder.isTypeSupported(c)) { mimeType = c; break; }
          }
          const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
          };
          mr.onstop = () => {
            const chunks = recordedChunksRef.current;
            if (chunks.length === 0) return;
            const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
            // revoke any previous URL before creating a new one
            setRecordingUrl(prev => {
              if (prev) URL.revokeObjectURL(prev);
              return URL.createObjectURL(blob);
            });
            setRecordingDurationMs(Math.round(performance.now() - recordStartRef.current));
          };
          recordStartRef.current = performance.now();
          mr.start();
          mediaRecorderRef.current = mr;
          setIsRecording(true);
        } catch (recErr) {
          console.warn('MediaRecorder unavailable, recording skipped:', recErr);
          // Don't leak the stream — tear down if MediaRecorder was the only thing failing
          if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch { /* ignore */ } sourceRef.current = null; }
          if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch { /* ignore */ } analyserRef.current = null; }
          if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
          if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
          setIsListening(false);
        }
      }
    } catch (err: any) {
      console.error('Microphone access error:', err);
      // Clean up all resources if something fails after getUserMedia
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch { /* ignore */ } sourceRef.current = null; }
      if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch { /* ignore */ } analyserRef.current = null; }
      if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
      if (err?.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access in your browser settings.');
      } else if (err?.name === 'NotFoundError') {
        setError('No microphone found. Connect one and try again.');
      } else {
        setError(err?.message ?? 'Failed to access microphone. Try interacting with the page first.');
      }
      setIsListening(false);
    } finally {
      startingRef.current = false;
    }
  }, [isListening, bufferSize, processFrame]);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    // ── Stop the MediaRecorder BEFORE the tracks are killed, so it flushes
    //    its final chunk and fires onstop. Skip if already inactive. ──
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      try { mr.stop(); } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
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
    lastVoicedRef.current = null;
    voicedStreakRef.current = 0;
    silentStreakRef.current = 0;
    lastEmitTsRef.current = 0;
    setIsListening(false);
    setCurrentFrame(null);
    setMicLevel(0);
  }, [smoothing]);

  const clearRecording = useCallback(() => {
    setRecordingUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setRecordingDurationMs(0);
    recordedChunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      stop();
      // revoke the blob URL on unmount to avoid leaking
      setRecordingUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      lastVoicedRef.current = null;
      voicedStreakRef.current = 0;
      silentStreakRef.current = 0;
      lastEmitTsRef.current = 0;
    };
  }, [stop]);

  return {
    isListening,
    error,
    start,
    stop,
    currentFrame,
    micLevel,
    audioContext: audioContextRef.current,
    micStream: streamRef.current,
    isRecording,
    recordingUrl,
    recordingDurationMs,
    clearRecording,
  };
}
