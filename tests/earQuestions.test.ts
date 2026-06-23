import { describe, it, expect } from 'vitest';
import { makeEarQuestion, makeIntervalMelodic, makeScaleIdentify, makeChordIdentify } from '../data/earQuestions';

describe('earQuestions data', () => {
  it('makeIntervalMelodic returns valid question', () => {
    const q = makeIntervalMelodic('intermediate', 1);
    expect(q.type).toBe('interval-melodic');
    expect(q.audioSequence.length).toBe(2);
    expect(q.options.length).toBe(4);
    expect(q.options).toContain(q.answer);
  });

  it('makeScaleIdentify returns valid question', () => {
    const q = makeScaleIdentify('beginner', 1);
    expect(q.type).toBe('scale-identify');
    expect(q.audioSequence.length).toBeGreaterThan(4);
    expect(q.options.length).toBe(4);
    expect(q.options).toContain(q.answer);
  });

  it('makeChordIdentify returns valid question', () => {
    const q = makeChordIdentify('advanced', 1);
    expect(q.type).toBe('chord-identify');
    expect(q.options.length).toBe(4);
    expect(q.options).toContain(q.answer);
  });

  it('makeEarQuestion dispatches correctly', () => {
    const q1 = makeEarQuestion('interval-melodic', 'beginner', 1);
    expect(q1.type).toBe('interval-melodic');
    const q2 = makeEarQuestion('scale-identify', 'intermediate', 1);
    expect(q2.type).toBe('scale-identify');
    const q3 = makeEarQuestion('chord-identify', 'advanced', 1);
    expect(q3.type).toBe('chord-identify');
  });

  it('all questions have positive XP', () => {
    for (let i = 0; i < 20; i++) {
      const q = makeEarQuestion('interval-melodic', 'intermediate', i);
      expect(q.xp).toBeGreaterThan(0);
    }
  });
});

describe('earQuestions shuffle (Fix 11 regression)', () => {
  it('is deterministic for the same seed', () => {
    expect(makeChordIdentify('advanced', 7).options).toEqual(makeChordIdentify('advanced', 7).options);
  });

  it('does not pin the answer to the first slot (old charCode-sort bias)', () => {
    const positions = new Set<number>();
    for (let seed = 0; seed < 60; seed++) {
      const q = makeIntervalMelodic('intermediate', seed);
      positions.add(q.options.indexOf(q.answer));
    }
    expect(positions.size).toBeGreaterThanOrEqual(3);
  });

  it('always yields 4 unique options containing the answer', () => {
    for (let seed = 0; seed < 40; seed++) {
      const q = makeScaleIdentify('intermediate', seed);
      expect(q.options.length).toBe(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
    }
  });
});