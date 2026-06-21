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
});
