// Display-side pitch smoothing for the Tuner.
//
// YIN + the live PitchSmoother already clean most octave errors and per-frame
// jitter, but the on-screen cents/needle can still wobble on a *held* note
// because it reflects the single latest qualified frame (microphone noise,
// vibrato excursion, breath). A short rolling median filtered to the CURRENT
// note gives a far steadier readout — the difference between a tuner that
// looks "precise" and one that looks "nervous".
//
// Pure + framework-free so it is unit-testable.

export interface CentsSample {
  note: string;   // noteName, e.g. "A4"
  cents: number;  // signed cents offset vs the nearest semitone
}

/**
 * Median of the recent cents samples that belong to `note`.
 *
 * Returns `null` when there aren't enough same-note samples yet (the caller
 * falls back to the latest frame). Filtering by note is essential: if the
 * singer moved from A4 to B4, mixing both into one median would land between
 * two notes and read as badly out-of-tune. Only same-note samples describe
 * the steady state of the note currently being held.
 *
 * @param history  recent samples (most recent pushed last); older-than-window
 *                 entries should already be trimmed by the caller
 * @param note     the note currently being displayed
 * @param minSamples  minimum same-note samples required for a median (default 3)
 */
export function medianCentsForNote(
  history: CentsSample[],
  note: string,
  minSamples = 3,
): number | null {
  const same = history.filter(s => s.note === note);
  if (same.length < minSamples) return null;
  const sorted = same.map(s => s.cents).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
