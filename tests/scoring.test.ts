import { describe, it, expect } from 'vitest';
import { scoreExercise } from '../services/scoringService';
import type { Exercise, PitchFrame } from '../types';

// Helper: create frames simulating singing a target note
function makeFrames(
  targetMidi: number,
  startMs: number,
  durationMs: number,
  a4 = 440,
  centsOff = 0,
  conf = 0.9,
  frameMs = 20,
): PitchFrame[] {
  const frames: PitchFrame[] = [];
  const freq = a4 * Math.pow(2, (targetMidi - 69 + centsOff / 100) / 12);
  for (let t = startMs; t < startMs + durationMs; t += frameMs) {
    frames.push({
      frequency: freq,
      confidence: conf,
      cents: centsOff,
      midi: targetMidi + centsOff / 100,
      noteName: 'X',
      octave: 0,
      timestamp: t,
    });
  }
  return frames;
}

const simpleExercise: Exercise = {
  id: 'test-ex',
  type: 'pitch-hold',
  title: 'Test',
  description: 'Test',
  level: 'beginner',
  targets: [{ midi: 69, startMs: 0, durationMs: 1000 }],
  xp: 20,
};

describe('scoringService', () => {
  it('returns zeros for empty frames', () => {
    const r = scoreExercise(simpleExercise, []);
    expect(r.score).toBe(0);
    expect(r.xpEarned).toBe(0);
  });

  it('scores perfect pitch high', () => {
    const frames = makeFrames(69, 0, 1000);
    const r = scoreExercise(simpleExercise, frames);
    expect(r.accuracyPct).toBeGreaterThan(90);
    expect(r.score).toBeGreaterThan(70);
    expect(r.xpEarned).toBeGreaterThan(10);
  });

  it('penalizes off-pitch singing', () => {
    // 50 cents off
    const frames = makeFrames(69, 0, 1000, 440, 50);
    const r = scoreExercise(simpleExercise, frames);
    expect(r.accuracyPct).toBeLessThan(60);
    expect(r.score).toBeLessThan(60);
  });

  it('handles missed targets (no frames in window)', () => {
    // frames outside the target window
    const frames = makeFrames(69, 2000, 500);
    const r = scoreExercise(simpleExercise, frames);
    expect(r.accuracyPct).toBe(0);
    expect(r.score).toBe(0);
  });

  it('rewards high coverage', () => {
    // sing the full duration
    const fullFrames = makeFrames(69, 0, 1000);
    const fullResult = scoreExercise(simpleExercise, fullFrames);

    // sing only 30% of the duration
    const partialFrames = makeFrames(69, 0, 300);
    const partialResult = scoreExercise(simpleExercise, partialFrames);

    expect(fullResult.score).toBeGreaterThan(partialResult.score);
  });

  it('handles multiple targets', () => {
    const multiEx: Exercise = {
      id: 'multi',
      type: 'scale-runner',
      title: 'Multi',
      description: 'Multi',
      level: 'beginner',
      targets: [
        { midi: 60, startMs: 0, durationMs: 500 },
        { midi: 62, startMs: 500, durationMs: 500 },
        { midi: 64, startMs: 1000, durationMs: 500 },
      ],
      xp: 30,
    };
    const frames = [
      ...makeFrames(60, 0, 500),
      ...makeFrames(62, 500, 500),
      ...makeFrames(64, 1000, 500),
    ];
    const r = scoreExercise(multiEx, frames);
    expect(r.accuracyPct).toBeGreaterThan(80);
    expect(r.score).toBeGreaterThan(60);
  });

  it('XP scales with score', () => {
    const perfectFrames = makeFrames(69, 0, 1000);
    const perfectResult = scoreExercise(simpleExercise, perfectFrames);

    const badFrames = makeFrames(69, 0, 1000, 440, 80);
    const badResult = scoreExercise(simpleExercise, badFrames);

    expect(perfectResult.xpEarned).toBeGreaterThan(badResult.xpEarned);
  });
});
