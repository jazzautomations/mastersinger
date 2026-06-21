import { describe, it, expect } from 'vitest';
import { PitchSmoother, smoothPitchSeries } from '../audio/pitchSmoothing';

describe('PitchSmoother', () => {
  it('reports unvoiced for zero-frequency input', () => {
    const s = new PitchSmoother();
    const out = s.push({ frequency: 0, confidence: 0 });
    expect(out.voiced).toBe(false);
    expect(out.frequency).toBe(0);
    expect(out.cents).toBe(0);
  });

  it('reports unvoiced for low-confidence input', () => {
    const s = new PitchSmoother({ minConfidence: 0.5 });
    const out = s.push({ frequency: 440, confidence: 0.2 });
    expect(out.voiced).toBe(false);
  });

  it('converges to the correct pitch for a steady tone', () => {
    const s = new PitchSmoother({ a4: 440 });
    let out;
    for (let i = 0; i < 20; i++) {
      out = s.push({ frequency: 440, confidence: 0.95 });
    }
    expect(out!.voiced).toBe(true);
    expect(out!.frequency).toBeGreaterThan(438);
    expect(out!.frequency).toBeLessThan(442);
    expect(out!.cents).toBeGreaterThanOrEqual(-3);
    expect(out!.cents).toBeLessThanOrEqual(3);
  });

  it('rejects a single-frame octave-up jump (880 → should stay near 440)', () => {
    const s = new PitchSmoother();
    // establish a stable 440
    for (let i = 0; i < 10; i++) s.push({ frequency: 440, confidence: 0.95 });
    // one rogue octave-up frame
    const out = s.push({ frequency: 880, confidence: 0.95 });
    expect(out.frequency).toBeLessThan(500);
    expect(out.frequency).toBeGreaterThan(400);
  });

  it('rejects a single-frame octave-down jump (220 → should stay near 440)', () => {
    const s = new PitchSmoother();
    for (let i = 0; i < 10; i++) s.push({ frequency: 440, confidence: 0.95 });
    const out = s.push({ frequency: 220, confidence: 0.95 });
    expect(out.frequency).toBeLessThan(500);
    expect(out.frequency).toBeGreaterThan(400);
  });

  it('reduces jitter vs raw input (variance of cents is lower)', () => {
    // simulate a 440 Hz tone with ±15 cents noise on every frame
    const raw: { frequency: number; confidence: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const noiseCents = (Math.random() - 0.5) * 30;
      const freq = 440 * Math.pow(2, noiseCents / 1200);
      raw.push({ frequency: freq, confidence: 0.9 });
    }
    const smoothed = smoothPitchSeries(raw);
    // discard warmup
    const smoothedCents = smoothed.slice(10).map(s => s.cents);
    const mean = smoothedCents.reduce((a, b) => a + b, 0) / smoothedCents.length;
    const variance = smoothedCents.reduce((a, b) => a + (b - mean) ** 2, 0) / smoothedCents.length;
    const stdDev = Math.sqrt(variance);
    // smoothed cents should cluster tightly around 0
    expect(Math.abs(mean)).toBeLessThan(4);
    expect(stdDev).toBeLessThan(6);
  });

  it('tracks a real pitch change (glide up a whole tone)', () => {
    const s = new PitchSmoother({ emaAlpha: 0.5 });
    for (let i = 0; i < 15; i++) s.push({ frequency: 440, confidence: 0.95 });
    // glide to 493.88 (B4)
    let out;
    for (let i = 0; i < 30; i++) out = s.push({ frequency: 493.88, confidence: 0.95 });
    expect(out!.frequency).toBeGreaterThan(490);
    expect(out!.frequency).toBeLessThan(496);
  });

  it('holds the last pitch briefly through a short silent gap', () => {
    const s = new PitchSmoother({ holdFrames: 3 });
    for (let i = 0; i < 10; i++) s.push({ frequency: 440, confidence: 0.95 });
    const held = s.push({ frequency: 0, confidence: 0 });
    expect(held.voiced).toBe(true); // still held
    expect(held.frequency).toBeGreaterThan(400);
    // after enough silent frames it goes silent
    s.push({ frequency: 0, confidence: 0 });
    s.push({ frequency: 0, confidence: 0 });
    s.push({ frequency: 0, confidence: 0 });
    const silent = s.push({ frequency: 0, confidence: 0 });
    expect(silent.voiced).toBe(false);
  });

  it('respects custom A4 reference', () => {
    const s = new PitchSmoother({ a4: 442 });
    let out;
    for (let i = 0; i < 15; i++) out = s.push({ frequency: 442, confidence: 0.95 });
    expect(out!.cents).toBeGreaterThanOrEqual(-3);
    expect(out!.cents).toBeLessThanOrEqual(3);
  });

  it('reset() clears state', () => {
    const s = new PitchSmoother();
    for (let i = 0; i < 10; i++) s.push({ frequency: 440, confidence: 0.95 });
    s.reset();
    const out = s.push({ frequency: 0, confidence: 0 });
    expect(out.voiced).toBe(false);
  });
});
