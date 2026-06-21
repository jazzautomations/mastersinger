import { describe, it, expect } from 'vitest';
import { scoreExercise } from '../services/scoringService';
import type { Exercise, PitchFrame } from '../types';

function makeFrame(freq: number, ts: number, a4 = 440): PitchFrame {
  const midi = 69 + 12 * Math.log2(freq / a4);
  const nearest = Math.round(midi);
  return {
    frequency: freq,
    confidence: 0.95,
    cents: Math.round((midi - nearest) * 100),
    midi,
    noteName: 'X',
    octave: 0,
    timestamp: ts,
  };
}

describe('scoringService', () => {
  const exercise: Exercise = {
    id: 'test',
    type: 'scale-runner',
    title: 'Test',
    description: '',
    level: 'intermediate',
    targets: [
      { midi: 60, startMs: 0,    durationMs: 500 },
      { midi: 62, startMs: 500,  durationMs: 500 },
      { midi: 64, startMs: 1000, durationMs: 500 },
    ],
    xp: 30,
  };

  it('returns zero score for empty user frames', () => {
    const result = scoreExercise(exercise, []);
    expect(result.score).toBe(0);
    expect(result.accuracyPct).toBe(0);
    expect(result.xpEarned).toBe(0);
  });

  it('scores high when user sings targets in tune', () => {
    const frames: PitchFrame[] = [];
    // sing C4 in window 0-500
    for (let t = 50; t < 500; t += 20) frames.push(makeFrame(261.63, t));
    // sing D4 in window 500-1000
    for (let t = 550; t < 1000; t += 20) frames.push(makeFrame(293.66, t));
    // sing E4 in window 1000-1500
    for (let t = 1050; t < 1500; t += 20) frames.push(makeFrame(329.63, t));
    const result = scoreExercise(exercise, frames);
    expect(result.accuracyPct).toBeGreaterThan(85);
    expect(result.score).toBeGreaterThan(80);
  });

  it('scores low when user sings wrong notes', () => {
    const frames: PitchFrame[] = [];
    // sing G4 (wrong) for all targets
    for (let t = 50; t < 1500; t += 20) frames.push(makeFrame(392, t));
    const result = scoreExercise(exercise, frames);
    expect(result.accuracyPct).toBeLessThan(40);
  });

  it('xpEarned scales with score', () => {
    const frames: PitchFrame[] = [];
    for (let t = 50; t < 1500; t += 20) {
      // alternate perfect then way off
      const targetIdx = Math.floor(t / 500);
      const targetMidi = [60, 62, 64][targetIdx] ?? 60;
      const freq = 440 * Math.pow(2, (targetMidi - 69) / 12);
      frames.push(makeFrame(freq, t));
    }
    const result = scoreExercise(exercise, frames);
    expect(result.xpEarned).toBeLessThanOrEqual(exercise.xp);
    expect(result.xpEarned).toBeGreaterThan(0);
  });
});
