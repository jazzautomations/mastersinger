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
  minConfidence?: number;    // smoother voiced gate (default 0.45). Lower it (e.g. 0.35)
                             // for a live tuner so the needle doesn't drop out on
                             // imperfect mics; the octave guard still rejects junk.
  record?: boolean;          // also capture raw audio for playback (default false)
  onFrame?: (frame: PitchFrame) => void;
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
    threshold = 0.12,
    smoothing = true,
    minConfidence,       // undefined → smoother uses its own default (0.45)
    record = false,
    onFrame,
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
  const startTimeRef = useRef<number>(0);
  const smootherRef = useRef<PitchSmoother>(new PitchSmoother(minConfidence != null ? { a4, minConfidence } : { a4 }));
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

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
      // raw path (smoothing disabled) — used by the Melody Studio so note
      // timestamps stay aligned with real time. Lower the confidence gate so
      // soft/edge-of-voiced frames still reach the transcriber, which then
      // applies its own median filter + segmentation. A higher gate here
      // would drop the attack and tail of every sung note.
      if (result.frequency > 0 && result.confidence > 0.3) {
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
        }
      }
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
    isRecording,
    recordingUrl,
    recordingDurationMs,
    clearRecording,
  };
}
