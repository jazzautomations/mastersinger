import swipe from 'pitch-detection/swipe.js';
import { detectPitchYin } from './yin';

export interface PitchResult {
  frequency: number;
  confidence: number;
  rms: number;
}

export type DetectorMode = 'swipe' | 'yin';

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number = 44100,
  threshold: number = 0.15,
  minFreq: number = 60,
  maxFreq: number = 1200,
  mode: DetectorMode = 'yin',
): PitchResult {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / buffer.length);
  if (rms < 0.002) {
    return { frequency: 0, confidence: 0, rms };
  }

  if (mode === 'swipe') {
    try {
      const result = swipe(buffer, {
        fs: sampleRate,
        minFreq,
        maxFreq,
        threshold,
        cents: 10,
      });
      if (result && result.freq > 0) {
        return {
          frequency: result.freq,
          confidence: result.clarity,
          rms,
        };
      }
    } catch {
      return yinFallback(buffer, sampleRate, threshold, minFreq, maxFreq);
    }
  }

  return yinFallback(buffer, sampleRate, threshold, minFreq, maxFreq);
}

function yinFallback(
  buffer: Float32Array,
  sampleRate: number,
  threshold: number,
  minFreq: number,
  maxFreq: number,
): PitchResult {
  return detectPitchYin(buffer, sampleRate, threshold, minFreq, maxFreq);
}
