import type { Exercise, ExerciseResult, PitchFrame } from '../types';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Median Absolute Deviation — robust outlier-resistant spread measure.
function mad(values: number[], med: number): number {
  if (values.length === 0) return 0;
  const absDevs = values.map(v => Math.abs(v - med));
  return median(absDevs);
}

export function scoreExercise(
  exercise: Exercise,
  userFrames: PitchFrame[],
  a4 = 440,
): Omit<ExerciseResult, 'exerciseId' | 'completedAt'> {
  if (userFrames.length === 0 || exercise.targets.length === 0) {
    return { score: 0, accuracyPct: 0, timingPct: 0, stabilityPct: 0, xpEarned: 0 };
  }

  const voiced = userFrames.filter(f => f.frequency > 0 && f.confidence > 0.4);
  if (voiced.length === 0) {
    return { score: 0, accuracyPct: 0, timingPct: 0, stabilityPct: 0, xpEarned: 0 };
  }

  let totalAccuracy = 0;
  let totalStability = 0;
  let totalTiming = 0;
  let totalCoverage = 0;
  let hitCount = 0;
  const n = exercise.targets.length;

  for (let i = 0; i < n; i++) {
    const target = exercise.targets[i];
    const windowStart = target.startMs;
    const windowEnd = target.startMs + target.durationMs;
    const duration = target.durationMs;

    // Grace margins: allow starting 30% early and holding 30% late, clipped
    // to the midpoint of adjacent targets to avoid double-counting.
    const graceBefore = duration * 0.30;
    const graceAfter = duration * 0.30;
    let expStart = windowStart - graceBefore;
    let expEnd = windowEnd + graceAfter;
    if (i > 0) {
      const prevEnd = exercise.targets[i - 1].startMs + exercise.targets[i - 1].durationMs;
      expStart = Math.max(expStart, (prevEnd + windowStart) / 2);
    }
    if (i < n - 1) {
      const nextStart = exercise.targets[i + 1].startMs;
      expEnd = Math.min(expEnd, (windowEnd + nextStart) / 2);
    }

    const framesInWindow = voiced.filter(f => f.timestamp >= expStart && f.timestamp < expEnd);
    if (framesInWindow.length === 0) continue;

    hitCount++;

    // ── Accuracy: median cents deviation via a NONLINEAR curve.
    //    This is the core of "precision". Within ±10 cents → near-perfect.
    //    ±25 cents → ~71%. Half-semitone (50 cents) → 0 (hard fail).
    //    No octave equivalence — you sing the wrong octave, you miss the note.
    //    Robust to brief slips via the median. ──
    const targetMidi = target.midi;
    const deviations = framesInWindow.map(f => Math.abs(f.midi - targetMidi) * 100);
    const medDev = median(deviations);
    const accuracy = Math.max(0, Math.min(100, 100 * Math.max(0, 1 - Math.pow(medDev / 50, 1.2))));
    totalAccuracy += accuracy;

    // ── Stability: MAD of cents (robust spread). ──
    const centsValues = framesInWindow.map(f => f.cents);
    const medCents = median(centsValues);
    const spread = mad(centsValues, medCents);
    // MAD of 0 = 100%, MAD of ~22 = 0% (4.5x multiplier).
    // More tolerant of natural vibrato (~10-15 cents MAD) than before.
    const stability = Math.max(0, Math.min(100, 100 - spread * 4.5));
    totalStability += stability;

    // ── Timing: symmetric — how close was the FIRST voiced onset to the
    //    target start? Measures both early and late starts. ──
    const firstVoiced = framesInWindow[0];
    const timingDelta = firstVoiced.timestamp - windowStart; // signed: + = late, - = early
    // ±150ms = full credit, linear decay to 0 at ±400ms
    const absDelta = Math.abs(timingDelta);
    const timing = absDelta <= 150
      ? 100
      : Math.max(0, 100 - ((absDelta - 150) / 250) * 100);
    totalTiming += timing;

    // ── Coverage: what fraction of the target duration had voiced frames? ──
    const frameSpan = framesInWindow.length > 1
      ? framesInWindow[framesInWindow.length - 1].timestamp - framesInWindow[0].timestamp
      : 16;
    const coverage = Math.min(1, frameSpan / duration);
    totalCoverage += coverage * 100;
  }

  // Divide by n (not hitCount) so missed notes penalize all metrics.
  const accuracyPct = Math.round(totalAccuracy / n);
  const stabilityPct = Math.round(totalStability / n);
  const timingPct = Math.round(totalTiming / n);
  const coveragePct = Math.round(totalCoverage / n);

  // Weighted: accuracy 50%, stability 20%, timing 15%, coverage 15%
  const score = Math.round(accuracyPct * 0.50 + stabilityPct * 0.20 + timingPct * 0.15 + coveragePct * 0.15);
  const xpEarned = Math.round(exercise.xp * (score / 100));

  return { score, accuracyPct, stabilityPct, timingPct, xpEarned };
}
