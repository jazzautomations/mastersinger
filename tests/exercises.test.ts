import { describe, it, expect } from 'vitest';
import { EXERCISES, getExerciseById, getExercisesByType, getExercisesByLevel, dailyChallengeExercises } from '../data/exercises';

describe('exercises data', () => {
  it('exports a non-empty array of exercises', () => {
    expect(EXERCISES.length).toBeGreaterThan(20);
  });

  it('has unique IDs', () => {
    const ids = EXERCISES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers all 4 exercise types', () => {
    const types = new Set(EXERCISES.map(e => e.type));
    expect(types.has('scale-runner')).toBe(true);
    expect(types.has('arpeggio-drill')).toBe(true);
    expect(types.has('interval-leap')).toBe(true);
    expect(types.has('pitch-hold')).toBe(true);
  });

  it('covers all 3 levels', () => {
    const levels = new Set(EXERCISES.map(e => e.level));
    expect(levels.has('beginner')).toBe(true);
    expect(levels.has('intermediate')).toBe(true);
    expect(levels.has('advanced')).toBe(true);
  });

  it('every exercise has at least one target', () => {
    EXERCISES.forEach(e => {
      expect(e.targets.length).toBeGreaterThan(0);
    });
  });

  it('every exercise has positive XP', () => {
    EXERCISES.forEach(e => {
      expect(e.xp).toBeGreaterThan(0);
    });
  });

  it('getExerciseById returns the right exercise', () => {
    const ex = getExerciseById('sc-beg-cmajor');
    expect(ex).toBeDefined();
    expect(ex?.type).toBe('scale-runner');
  });

  it('getExerciseById returns undefined for unknown id', () => {
    expect(getExerciseById('nonexistent')).toBeUndefined();
  });

  it('getExercisesByType filters correctly', () => {
    const scales = getExercisesByType('scale-runner');
    expect(scales.length).toBeGreaterThan(0);
    expect(scales.every(e => e.type === 'scale-runner')).toBe(true);
  });

  it('getExercisesByLevel filters correctly', () => {
    const beg = getExercisesByLevel('beginner');
    expect(beg.length).toBeGreaterThan(0);
    expect(beg.every(e => e.level === 'beginner')).toBe(true);
  });

  it('dailyChallengeExercises returns 3 exercises', () => {
    const daily = dailyChallengeExercises(new Date('2024-06-21T12:00:00'));
    expect(daily.length).toBe(3);
  });

  it('dailyChallengeExercises is deterministic for the same day', () => {
    const d1 = dailyChallengeExercises(new Date('2024-06-21T08:00:00'));
    const d2 = dailyChallengeExercises(new Date('2024-06-21T20:00:00'));
    expect(d1.map(e => e.id)).toEqual(d2.map(e => e.id));
  });
});
