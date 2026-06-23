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

  // ── Regression: subharmonic / period-doubling. Pressed phonation and vocal
  //    fry edges make the waveform repeat at 2× the true period, so YIN locks
  //    onto the doubled period and reports a full octave too LOW (the other
  //    half of the "tuner is jumping octaves" complaint). The detector must
  //    recover the perceived (higher) fundamental.
  it('corrects subharmonic doubling (period doubled) up to the true fundamental', () => {
    // Realistic pressed-phonation / fry: a breathy vowel (weak F0, strong
    // harmonics) with a moderate sub-frequency at F0/2 makes the waveform
    // repeat at 2x the period on some frames, so YIN flips down an octave.
    // This is the "tuner is jumping octaves" complaint. The detector must be
    // correct-DOMINANT so the smoother (which folds octave jumps against the
    // established reference) can stabilise on the true fundamental.
    function breathyWithSub(f0: number, ms: number, subAmp: number): Float32Array {
      const n = Math.floor(sampleRate * ms / 1000);
      const buf = new Float32Array(n);
      let phase = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const vib = 1 + (12 / 1200) * Math.sin(2 * Math.PI * 5.5 * t);
        const jit = 1 + 0.012 * (Math.random() - 0.5) * 2;
        phase += 2 * Math.PI * f0 * vib * jit / sampleRate;
        let s = 0.18 * Math.sin(phase) + 1.0 * Math.sin(2 * phase)
          + 0.55 * Math.sin(3 * phase) + 0.25 * Math.sin(4 * phase);
        s += subAmp * Math.sin(phase / 2);     // subharmonic (period-doubling)
        s += 0.06 * (Math.random() - 0.5);      // breath noise
        buf[i] = 0.45 * s;
      }
      return buf;
    }
    // Frame-by-frame (4096 @ 44.1k = 93ms, like the live detector) over a
    // sustained tone; the MEDIAN must land on the true fundamental, not an
    // octave below.
    const buf = breathyWithSub(196, 600, 0.5);
    const win = 4096, hop = 512;
    const freqs: number[] = [];
    for (let i = 0; i + win <= buf.length; i += hop) {
      const r = detectPitchYin(buf.subarray(i, i + win), sampleRate, 0.12, 60, 1200);
      if (r.frequency > 0) freqs.push(r.frequency);
    }
    const sorted = [...freqs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    // median must be the true fundamental (~196), NOT the subharmonic (~98)
    expect(median).toBeGreaterThan(150);
    expect(median).toBeLessThan(220);
  });

  it('stays on the true fundamental across the singing range with a moderate subharmonic', () => {
    function breathyWithSub(f0: number, ms: number, subAmp: number): Float32Array {
      const n = Math.floor(sampleRate * ms / 1000);
      const buf = new Float32Array(n);
      let phase = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sampleRate;
        const vib = 1 + (12 / 1200) * Math.sin(2 * Math.PI * 5.5 * t);
        const jit = 1 + 0.012 * (Math.random() - 0.5) * 2;
        phase += 2 * Math.PI * f0 * vib * jit / sampleRate;
        let s = 0.18 * Math.sin(phase) + 1.0 * Math.sin(2 * phase)
          + 0.55 * Math.sin(3 * phase) + 0.25 * Math.sin(4 * phase);
        s += subAmp * Math.sin(phase / 2);
        s += 0.06 * (Math.random() - 0.5);
        buf[i] = 0.45 * s;
      }
      return buf;
    }
    for (const f0 of [130.81, 196, 261.63, 329.63, 392, 523.25]) {
      const buf = breathyWithSub(f0, 600, 0.25);
      const win = 4096, hop = 512;
      const freqs: number[] = [];
      for (let i = 0; i + win <= buf.length; i += hop) {
        const r = detectPitchYin(buf.subarray(i, i + win), sampleRate, 0.12, 60, 1200);
        if (r.frequency > 0) freqs.push(r.frequency);
      }
      const sorted = [...freqs].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      // within ~half a semitone of the true fundamental — never an octave off
      expect(median, `f0=${f0}Hz`).toBeGreaterThan(f0 * 0.99);
      expect(median, `f0=${f0}Hz`).toBeLessThan(f0 * 1.01);
    }
  });

  it('does NOT over-correct a true low note up an octave', () => {
    // A genuine 98 Hz fundamental (with its own harmonics at 196, 294...) must
    // stay at 98 Hz — the up-shift must not fire, because there is no dip at
    // half the period of a true low note.
    const freq = 98.0;
    const samples = Math.floor(sampleRate * 200 / 1000);
    const buffer = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = 2 * Math.PI * freq * i / sampleRate;
      buffer[i] = 0.5 * Math.sin(x) + 0.25 * Math.sin(2 * x) + 0.12 * Math.sin(3 * x);
    }
    const result = detectPitchYin(buffer, sampleRate, 0.12, 60, 1200);
    expect(result.frequency).toBeGreaterThan(94);
    expect(result.frequency).toBeLessThan(102);
    // must NOT jump an octave up to ~196 Hz
    expect(result.frequency).toBeLessThan(150);
  });
});
