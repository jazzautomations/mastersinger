// ──────────────────────────────────────────────────────────────────────────
// Pitch smoothing — turns jittery per-frame YIN estimates into a stable,
// musical pitch readout. This is the single biggest lever for "precision"
// in a live tuner: raw YIN bounces every frame and occasionally jumps an
// octave, so the cents needle looks drunk. A median filter kills single-frame
// outliers, a light EMA smooths continuous motion, and an octave-jump
// rejector suppresses the classic YIN doubling/halving error.
//
// Pure + framework-free so it is unit-testable.
// ──────────────────────────────────────────────────────────────────────────

export interface RawPitch {
  frequency: number;   // Hz, 0 if unvoiced
  confidence: number;  // 0..1
}

export interface SmoothedPitch {
  frequency: number;   // smoothed Hz, 0 if unvoiced
  confidence: number;  // smoothed 0..1
  midi: number;        // float midi note (0 if unvoiced)
  cents: number;       // -50..+50 deviation from nearest note (0 if unvoiced)
  voiced: boolean;
}

export interface PitchSmootherOptions {
  windowSize?: number;       // median window (recent voiced estimates)
  emaAlpha?: number;         // 0..1 — higher = more responsive, less smooth
  maxOctaveJump?: number;    // reject octave errors (1.0 = off, typical 0.5)
  a4?: number;               // tuning reference
  minConfidence?: number;    // below this a frame is treated as unvoiced
  holdFrames?: number;       // keep last pitch alive briefly through silent gaps
}

const DEFAULTS: Required<PitchSmootherOptions> = {
  windowSize: 9,        // wider median → kills more single-frame outliers + octave flicker
  emaAlpha: 0.40,       // slightly smoother: less needle jitter while still tracking the voice
  maxOctaveJump: 0.5,
  a4: 440,
  minConfidence: 0.40,  // accept noisier frames (real phone/laptop mics); octave guard still rejects junk
  holdFrames: 4,        // hold the last pitch longer through brief dips
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export class PitchSmoother {
  private opts: Required<PitchSmootherOptions>;
  private history: number[] = [];
  private emaMidi = 0;
  private emaConf = 0;
  private hasEma = false;
  private silentFrames = 0;
  private lastVoiced: SmoothedPitch = {
    frequency: 0, confidence: 0, midi: 0, cents: 0, voiced: false,
  };

  constructor(options: PitchSmootherOptions = {}) {
    this.opts = { ...DEFAULTS, ...options };
  }

  reset(): void {
    this.history = [];
    this.emaMidi = 0;
    this.emaConf = 0;
    this.hasEma = false;
    this.silentFrames = 0;
    this.lastVoiced = { frequency: 0, confidence: 0, midi: 0, cents: 0, voiced: false };
  }

  /**
   * Push a raw YIN estimate and get a smoothed, octave-corrected pitch.
   */
  push(raw: RawPitch): SmoothedPitch {
    const { windowSize, emaAlpha, a4, minConfidence, holdFrames } = this.opts;

    const voiced = raw.frequency > 0 && raw.confidence >= minConfidence;

    // ── Unvoiced: hold the last pitch briefly so brief dips don't flicker,
    //    then declare silence. ──
    if (!voiced) {
      this.silentFrames++;
      if (this.silentFrames <= holdFrames && this.lastVoiced.voiced) {
        return { ...this.lastVoiced, confidence: this.lastVoiced.confidence * 0.6 };
      }
      // Keep the last few voiced estimates as an octave reference across the
      // gap (Fix 7): previously history was wiped on silence, so for the first
      // ~3 frames after re-entry the octave-jump rejector had no reference and
      // YIN doubling/halving errors passed straight through. hasEma is still
      // reset so the EMA re-seeds cleanly instead of dragging a stale value.
      this.history = this.history.slice(-3);
      this.hasEma = false;
      const silent: SmoothedPitch = { frequency: 0, confidence: 0, midi: 0, cents: 0, voiced: false };
      this.lastVoiced = silent;
      return silent;
    }

    this.silentFrames = 0;

    // ── Octave-error rejection. Compare against the recent median: if the new
    //    estimate is roughly 2× or ½× the stable pitch, it's almost certainly
    //    a YIN octave jump — fold it back to the correct octave. A wider
    //    acceptance band (1.7–2.3) catches more octave errors without eating
    //    legitimate large leaps (which singers rarely make in one frame). ──
    let freq = raw.frequency;
    if (this.history.length >= 3) {
      const ref = median(this.history);
      if (ref > 0) {
        const ratio = freq / ref;
        if (ratio > 1.7 && ratio < 2.3) freq = freq / 2;
        else if (ratio > 0.43 && ratio < 0.59) freq = freq * 2;
        else if (this.hasEma && (ratio > 2.3 || ratio < 0.42)) {
          // Wild outlier — trust the recent median rather than this frame,
          // but only while we were continuously tracking (hasEma). Right
          // after a silent gap the history is a stale reference kept only for
          // octave-folding, so a legitimate large leap on re-entry must not
          // be snapped back to it.
          freq = ref;
        }
      }
    }

    // ── Median window over the (octave-corrected) estimates. ──
    this.history.push(freq);
    if (this.history.length > windowSize) this.history.shift();
    const medFreq = median(this.history);

    // ── EMA in the MIDI (log) domain for a silky-smooth readout (Fix 6).
    //    Smoothing in Hz made lows jittery (a few Hz is many cents down low)
    //    and highs sluggish (a few Hz is fractional cents up high); in
    //    MIDI/cents space the same alpha gives uniform perceptual smoothing
    //    across the whole range. ──
    const medMidi = 69 + 12 * Math.log2(medFreq / a4);
    if (!this.hasEma) {
      this.emaMidi = medMidi;
      this.emaConf = raw.confidence;
      this.hasEma = true;
    } else {
      this.emaMidi = emaAlpha * medMidi + (1 - emaAlpha) * this.emaMidi;
      this.emaConf = emaAlpha * raw.confidence + (1 - emaAlpha) * this.emaConf;
    }

    const midi = this.emaMidi;
    const frequency = a4 * Math.pow(2, (midi - 69) / 12);
    const nearest = Math.round(midi);
    const cents = Math.round((midi - nearest) * 100);

    const out: SmoothedPitch = {
      frequency,
      confidence: this.emaConf,
      midi,
      cents,
      voiced: true,
    };
    this.lastVoiced = out;
    return out;
  }
}

/** Convenience: smooth a whole buffer of raw frames at once (for offline use). */
export function smoothPitchSeries(
  raw: RawPitch[],
  options?: PitchSmootherOptions,
): SmoothedPitch[] {
  const s = new PitchSmoother(options);
  return raw.map(r => s.push(r));
}
