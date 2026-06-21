import type { Exercise, ExerciseResult, PitchFrame } from '../types';

// Score a user's singing against an exercise's target notes.
// Returns accuracy, timing, stability percentages.
export function scoreExercise(
  exercise: Exercise,
  userFrames: PitchFrame[],
  a4 = 440,
): Omit<ExerciseResult, 'exerciseId' | 'completedAt'> {
  if (userFrames.length === 0 || exercise.targets.length === 0) {
    return { score: 0, accuracyPct: 0, timingPct: 0, stabilityPct: 0, xpEarned: 0 };
  }

  // For each target, find user frames within its time window
  let totalAccuracy = 0;
  let totalStability = 0;
  let totalTiming = 0;
  let hitCount = 0;

  for (const target of exercise.targets) {
    const windowStart = target.startMs;
    const windowEnd = target.startMs + target.durationMs;
    // Strict window (no extension) to avoid overlap with adjacent targets.
    // Allow a small leading edge to catch early starts.
    const framesInWindow = userFrames.filter(f =>
      f.frequency > 0 &&
      f.confidence > 0.5 &&
      f.timestamp >= windowStart &&
      f.timestamp < windowEnd
    );

    if (framesInWindow.length === 0) {
      // missed entirely
      continue;
    }

    // Accuracy: average deviation from target (in cents, normalized).
    // Note: f.midi is a floating-point value, so |f.midi - targetMidi| * 100
    // already captures the full cents deviation — no need to add f.cents.
    const targetMidi = target.midi;
    const deviations = framesInWindow.map(f => Math.abs(f.midi - targetMidi) * 100);
    const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    // 0 cents deviation = 100%, 100 cents = 0%
    const accuracy = Math.max(0, 100 - avgDev);
    totalAccuracy += accuracy;

    // Stability: standard deviation of cents within the window
    const centsValues = framesInWindow.map(f => f.cents);
    const mean = centsValues.reduce((a, b) => a + b, 0) / centsValues.length;
    const variance = centsValues.reduce((a, b) => a + (b - mean) ** 2, 0) / centsValues.length;
    const stdDev = Math.sqrt(variance);
    // stdDev of 0 = 100%, stdDev of 30 = 0%
    const stability = Math.max(0, 100 - stdDev * 3.3);
    totalStability += stability;

    // Timing: did the user start within ±200ms of the target start?
    const firstVoiced = framesInWindow[0];
    const timingDelta = Math.abs(firstVoiced.timestamp - windowStart);
    const timing = Math.max(0, 100 - (timingDelta / 200) * 50); // 200ms = 75% timing
    totalTiming += timing;

    hitCount++;
  }

  const n = exercise.targets.length;
  const accuracyPct = hitCount > 0 ? Math.round(totalAccuracy / n) : 0;
  const stabilityPct = hitCount > 0 ? Math.round(totalStability / n) : 0;
  const timingPct = Math.round(totalTiming / n);
  const score = Math.round((accuracyPct * 0.5 + stabilityPct * 0.3 + timingPct * 0.2));

  // XP earned — full XP if accuracy >= 90%, scaled down otherwise
  const xpEarned = Math.round(exercise.xp * (score / 100));

  return {
    score,
    accuracyPct,
    timingPct,
    stabilityPct,
    xpEarned,
  };
}
