import { describe, it, expect } from 'vitest';
import {
  centsOffOctaveEquiv,
  generateVocalPhrase,
  makeDegreeRound,
  makeSightPhrase,
  VOCAL_LEVELS,
} from '../data/games';

describe('centsOffOctaveEquiv', () => {
  it('is 0 for the exact note', () => {
    expect(centsOffOctaveEquiv(60, 60)).toBe(0);
  });
  it('treats octaves as equivalent (same pitch class = 0 cents)', () => {
    expect(centsOffOctaveEquiv(72, 60)).toBe(0);   // +1 oitava
    expect(centsOffOctaveEquiv(48, 60)).toBe(0);   // -1 oitava
    expect(centsOffOctaveEquiv(84, 60)).toBe(0);   // +2 oitavas
  });
  it('measures the nearest semitone distance in cents', () => {
    expect(centsOffOctaveEquiv(61, 60)).toBe(100); // 1 semitom
    expect(centsOffOctaveEquiv(59, 60)).toBe(100);
    expect(centsOffOctaveEquiv(60.4, 60)).toBeCloseTo(40, 5); // 40 cents sustenido
  });
  it('takes the shorter way around the octave', () => {
    // 11 semitons acima = 1 semitom abaixo da oitava → 100 cents
    expect(centsOffOctaveEquiv(71, 60)).toBe(100);
  });
});

describe('generateVocalPhrase', () => {
  it('returns the right number of notes per level kind', () => {
    expect(generateVocalPhrase(1, 60)).toHaveLength(1);
    expect(generateVocalPhrase(4, 60)).toHaveLength(3); // triad-major
    expect(generateVocalPhrase(7, 60)).toHaveLength(5); // penta
  });
  it('builds a real major triad on level 4', () => {
    const [a, b, c] = generateVocalPhrase(4, 60);
    expect(b - a).toBe(4);
    expect(c - a).toBe(7);
  });
  it('keeps notes near the singer center', () => {
    const notes = generateVocalPhrase(12, 60);
    for (const n of notes) expect(Math.abs(n - 60)).toBeLessThan(24);
  });
  it('has 12 levels defined', () => {
    expect(VOCAL_LEVELS).toHaveLength(12);
  });
});

describe('makeDegreeRound', () => {
  it('targets a note within the generated scale', () => {
    const r = makeDegreeRound(60, 7);
    expect(r.scale).toContain(r.targetMidi);
    expect(r.targetMidi).toBe(r.scale[r.degreeIdx]);
  });
  it('respects maxDegree', () => {
    for (let i = 0; i < 30; i++) {
      const r = makeDegreeRound(60, 3);
      expect(r.degreeIdx).toBeLessThan(3);
    }
  });
});

describe('makeSightPhrase', () => {
  it('grows with level and starts on the tonic', () => {
    const p1 = makeSightPhrase(60, 1);
    const p8 = makeSightPhrase(60, 8);
    expect(p1.notes[0]).toBe(p1.tonic);
    expect(p8.notes.length).toBeGreaterThanOrEqual(p1.notes.length);
    expect(p8.notes.length).toBeLessThanOrEqual(8);
  });
});
