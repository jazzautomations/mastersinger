import { describe, it, expect } from 'vitest';
import { detectPitchYin, detectPitchOnFrame } from '../audio/yin';

// Generate a sine wave buffer
function makeSineWave(freq: number, sampleRate: number, durationMs: number, amplitude = 0.5): Float32Array {
  const samples = Math.floor(sampleRate * durationMs / 1000);
  const buffer = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    buffer[i] = amplitude * Math.sin(2 * Math.PI * freq * i / sampleRate);
  }
  return buffer;
}

describe('YIN pitch detection', () => {
  const sampleRate = 44100;

  it('detects A4 (440 Hz) sine wave', () => {
    const buffer = makeSineWave(440, sampleRate, 100);
    const result = detectPitchYin(buffer, sampleRate);
    expect(result.frequency).toBeGreaterThan(435);
    expect(result.frequency).toBeLessThan(445);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('detects C4 (~261.63 Hz) sine wave', () => {
    const buffer = makeSineWave(261.63, sampleRate, 100);
    const result = detectPitchYin(buffer, sampleRate);
    expect(result.frequency).toBeGreaterThan(258);
    expect(result.frequency).toBeLessThan(266);
  });

  it('detects A5 (880 Hz) sine wave', () => {
    const buffer = makeSineWave(880, sampleRate, 100);
    const result = detectPitchYin(buffer, sampleRate);
    expect(result.frequency).toBeGreaterThan(875);
    expect(result.frequency).toBeLessThan(885);
  });

  it('returns 0 frequency for silence', () => {
    const buffer = new Float32Array(2048); // all zeros
    const result = detectPitchYin(buffer, sampleRate);
    expect(result.frequency).toBe(0);
    expect(result.confidence).toBe(0);
  });

  it('returns 0 frequency for very low amplitude noise', () => {
    const buffer = new Float32Array(2048).map(() => (Math.random() - 0.5) * 0.001);
    const result = detectPitchYin(buffer, sampleRate);
    expect(result.frequency).toBe(0);
  });

  it('detects low frequency (E2, ~82 Hz)', () => {
    const buffer = makeSineWave(82, sampleRate, 200);
    const result = detectPitchYin(buffer, sampleRate);
    expect(result.frequency).toBeGreaterThan(78);
    expect(result.frequency).toBeLessThan(86);
  });

  it('respects minFreq / maxFreq bounds (returns 0 or in-bounds frequency)', () => {
    const buffer = makeSineWave(440, sampleRate, 100);
    const result = detectPitchYin(buffer, sampleRate, 0.12, 500, 1000);
    // YIN's tau range restricts detection; result is either 0 (rejected) or in [500, 1000]
    if (result.frequency > 0) {
      expect(result.frequency).toBeGreaterThanOrEqual(500);
      expect(result.frequency).toBeLessThanOrEqual(1000);
    }
  });

  it('detectPitchOnFrame returns midi + cents', () => {
    const buffer = makeSineWave(440, sampleRate, 100);
    const result = detectPitchOnFrame(buffer, sampleRate, 440);
    expect(result.midi).toBeCloseTo(69, 1);
    expect(result.cents).toBeGreaterThanOrEqual(-10);
    expect(result.cents).toBeLessThanOrEqual(10);
  });

  it('detectPitchOnFrame returns cents near +25 for sharp frequency (25 cents sharp)', () => {
    const sharpFreq = 440 * Math.pow(2, 0.25 / 12); // 25 cents sharp
    const buffer = makeSineWave(sharpFreq, sampleRate, 100);
    const result = detectPitchOnFrame(buffer, sampleRate, 440);
    expect(result.cents).toBeGreaterThan(15);
    expect(result.cents).toBeLessThan(35);
  });

  // ── Regression: octave-error correction. The #1 "imprecise tuner" complaint
  //    was YIN locking onto the 2nd harmonic when the fundamental is masked
  //    (breathy/tense phonation, certain vowels), reporting a full octave
  //    (1200 cents) too high. These must now detect the TRUE fundamental.
  it('corrects octave-up error when 2nd harmonic dominates (weak fundamental)', () => {
    // fundamental=0.2, 2nd harmonic=1.0 — a realistic masked-fundamental voice
    const freq = 130.81; // C3
    const samples = Math.floor(sampleRate * 100 / 1000);
    const buffer = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = 2 * Math.PI * freq * i / sampleRate;
      buffer[i] = 0.2 * Math.sin(x) + 1.0 * Math.sin(2 * x) + 0.5 * Math.sin(3 * x);
    }
    const result = detectPitchYin(buffer, sampleRate, 0.12, 60, 1200);
    expect(result.frequency).toBeGreaterThan(125);
    expect(result.frequency).toBeLessThan(137);
    // must NOT report the octave-up (~262 Hz)
    expect(result.frequency).toBeLessThan(200);
  });

  it('corrects octave-up error across the singing range (weak fundamental)', () => {
    const cases = [82.41, 130.81, 196.0, 261.63, 392.0, 523.25];
    for (const freq of cases) {
      const samples = Math.floor(sampleRate * 100 / 1000);
      const buffer = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        const x = 2 * Math.PI * freq * i / sampleRate;
        buffer[i] = 0.2 * Math.sin(x) + 1.0 * Math.sin(2 * x) + 0.5 * Math.sin(3 * x);
      }
      const result = detectPitchYin(buffer, sampleRate, 0.12, 60, 1200);
      expect(result.frequency, `freq ${freq}Hz`).toBeGreaterThan(freq * 0.97);
      expect(result.frequency, `freq ${freq}Hz`).toBeLessThan(freq * 1.03);
    }
  });

  it('does NOT over-correct clean tones down an octave', () => {
    // A clean fundamental must stay at its true pitch, not drop an octave.
    const freq = 261.63; // C4
    const buffer = makeSineWave(freq, sampleRate, 100, 0.5);
    const result = detectPitchYin(buffer, sampleRate, 0.12, 60, 1200);
    expect(result.frequency).toBeGreaterThan(258);
    expect(result.frequency).toBeLessThan(266);
    // must NOT report the octave-down (~131 Hz)
    expect(result.frequency).toBeGreaterThan(200);
  });
});
