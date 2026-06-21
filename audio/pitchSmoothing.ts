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
  windowSize: 7,
  emaAlpha: 0.35,
  maxOctaveJump: 0.5,
  a4: 440,
  minConfidence: 0.5,
  holdFrames: 3,
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
  private emaFreq = 0;
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
    this.emaFreq = 0;
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
      this.history = [];
      this.hasEma = false;
      const silent: SmoothedPitch = { frequency: 0, confidence: 0, midi: 0, cents: 0, voiced: false };
      this.lastVoiced = silent;
      return silent;
    }

    this.silentFrames = 0;

    // ── Octave-error rejection. Compare against the recent median: if the new
    //    estimate is roughly 2× or ½× the stable pitch, it's almost certainly
    //    a YIN octave jump — fold it back to the correct octave. ──
    let freq = raw.frequency;
    if (this.history.length >= 3) {
      const ref = median(this.history);
      if (ref > 0) {
        const ratio = freq / ref;
        if (ratio > 1.8 && ratio < 2.25) freq = freq / 2;
        else if (ratio > 0.45 && ratio < 0.56) freq = freq * 2;
        else if (ratio > 2.25 || ratio < 0.44) {
          // Wild outlier — trust the recent median rather than this frame.
          freq = ref;
        }
      }
    }

    // ── Median window over the (octave-corrected) estimates. ──
    this.history.push(freq);
    if (this.history.length > windowSize) this.history.shift();
    const medFreq = median(this.history);

    // ── EMA on top of the median for a silky-smooth readout. ──
    if (!this.hasEma) {
      this.emaFreq = medFreq;
      this.emaConf = raw.confidence;
      this.hasEma = true;
    } else {
      this.emaFreq = emaAlpha * medFreq + (1 - emaAlpha) * this.emaFreq;
      this.emaConf = emaAlpha * raw.confidence + (1 - emaAlpha) * this.emaConf;
    }

    const midi = 69 + 12 * Math.log2(this.emaFreq / a4);
    const nearest = Math.round(midi);
    const cents = Math.round((midi - nearest) * 100);

    const out: SmoothedPitch = {
      frequency: this.emaFreq,
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
