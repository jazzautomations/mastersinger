// ──────────────────────────────────────────────────────────────────────────
// YIN pitch detection algorithm — pure TypeScript implementation
// Reference: de Cheveigné & Kawahara (2002) "YIN, a fundamental frequency
// estimator for speech and music". JASA 111(4):1917-1930.
//
// YIN improves on autocorrelation by:
//   1. Using the difference function (cumulative mean normalized difference)
//      instead of raw autocorrelation — avoids octave errors.
//   2. Applying an absolute threshold to pick the first dip below it.
//   3. Parabolic interpolation around the chosen dip for sub-sample precision.
// ──────────────────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLD = 0.12;
const DEFAULT_SAMPLE_RATE = 44100;
// When no tau clears the absolute threshold, we only accept a fallback pitch
// if the global minimum is a clear local valley below this value. Raising
// robustness here (was 0.6) cuts false pitches on breathy/noisy frames — a
// brief "no pitch" is far less damaging to a tuner than a confidently wrong
// one. Pure tones always clear the main threshold path, so this only affects
// the degraded fallback.
const FALLBACK_MAX_YIN = 0.5;
// ── Octave-error correction thresholds ──
// YIN's biggest failure mode for the singing voice: when the 2nd harmonic is
// stronger than the fundamental (breathy phonation, tense production, certain
// vowels, falsetto-to-mix transitions), the difference function dips hardest
// at HALF the true period — so it reports a pitch one octave too high. The
// ear still hears the lower octave (missing-fundamental perception), so the
// tuner showing the wrong note entirely is the #1 "imprecise" complaint.
// Fix: after picking tau, also test 2*tau (one octave lower). If the YIN
// value there is reasonably low, the true fundamental almost certainly lives
// at 2*tau — prefer it. Applied in the CORE detector so every consumer (live
// smoother, studio transcriber) benefits, and the downstream rolling-median
// octave guards never see a consistently-wrong reference (which is exactly
// why they failed to self-correct before).

/**
 * Step 1+2: Difference function + cumulative mean normalized difference.
 * Returns d'[tau] for tau in [0, maxTau].
 */
function difference(buffer: Float32Array, maxTau: number): Float32Array {
  const diff = new Float32Array(maxTau);
  const limit = buffer.length;
  for (let tau = 1; tau < maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < limit - tau; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // cumulative mean normalized difference
  const yin = new Float32Array(maxTau);
  yin[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < maxTau; tau++) {
    runningSum += diff[tau];
    yin[tau] = runningSum > 0 ? (diff[tau] * tau) / runningSum : 1;
  }
  return yin;
}

/**
 * Step 3: Absolute threshold. Find the smallest tau >= minTau where
 * yin[tau] < threshold, and yin stays below threshold for a small window
 * after. Starting at minTau (instead of 2) prevents the algorithm from
 * locking onto a harmonic above maxFreq and then reporting "no pitch".
 */
function absoluteThreshold(yin: Float32Array, threshold: number, minTau: number): number {
  let tau = Math.max(2, minTau);
  while (tau < yin.length - 1) {
    if (yin[tau] < threshold) {
      // descend to local minimum
      while (tau + 1 < yin.length - 1 && yin[tau + 1] < yin[tau]) {
        tau++;
      }
      return tau;
    }
    tau++;
  }
  // No tau below the absolute threshold. Fall back to the best LOCAL valley
  // in the valid range — but only if it is a genuine dip (a local minimum
  // below FALLBACK_MAX_YIN). Returning the global min blindly (the old
  // behavior, up to 0.6) turned flat/noisy frames into confidently wrong
  // pitches; a local-valley requirement rejects that garbage and lets the
  // caller report "no pitch" instead.
  let minTauFound = -1;
  let minVal = FALLBACK_MAX_YIN;
  for (let i = Math.max(2, minTau) + 1; i < yin.length - 1; i++) {
    if (yin[i] < minVal && yin[i] < yin[i - 1] && yin[i] <= yin[i + 1]) {
      minVal = yin[i];
      minTauFound = i;
    }
  }
  return minTauFound;
}

/**
 * Step 4: Parabolic interpolation around tau for sub-sample precision.
 */
function parabolicInterpolation(yin: Float32Array, tau: number): number {
  if (tau <= 0 || tau >= yin.length - 1) return tau;
  const s0 = yin[tau - 1];
  const s1 = yin[tau];
  const s2 = yin[tau + 1];
  const denom = 2 * (2 * s1 - s2 - s0);
  if (denom === 0) return tau;
  return tau + (s2 - s0) / denom;
}

export interface YinResult {
  frequency: number;     // Hz, 0 if no pitch
  confidence: number;    // 0..1
  rms: number;           // RMS amplitude of the buffer
}

/**
 * Detect pitch of a buffer using YIN.
 * @param buffer  Float32Array of mono PCM samples (-1..1)
 * @param sampleRate  sample rate in Hz
 * @param threshold  YIN absolute threshold (lower = stricter)
 * @param minFreq  minimum detectable frequency (Hz)
 * @param maxFreq  maximum detectable frequency (Hz)
 */
export function detectPitchYin(
  buffer: Float32Array,
  sampleRate: number = DEFAULT_SAMPLE_RATE,
  threshold: number = DEFAULT_THRESHOLD,
  minFreq: number = 60,       // lowered from 70 → catches bass/baritone lows (C2=65.4Hz, B1=61.7Hz)
  maxFreq: number = 1200,
): YinResult {
  // RMS gate — silence detection
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / buffer.length);
  if (rms < 0.003) {
    return { frequency: 0, confidence: 0, rms };
  }

  const minTau = Math.floor(sampleRate / maxFreq);
  const maxTau = Math.min(Math.floor(sampleRate / minFreq), buffer.length - 1);
  if (maxTau <= minTau) return { frequency: 0, confidence: 0, rms };

  // YIN works on a window of 2 * maxTau samples
  const windowSize = 2 * maxTau;
  const window = buffer.subarray(0, Math.min(windowSize, buffer.length));
  const yin = difference(window, maxTau);

  const tauEstimate = absoluteThreshold(yin, threshold, minTau);
  if (tauEstimate === -1) {
    return { frequency: 0, confidence: 0, rms };
  }

  // ── Octave-error correction (the critical fix for singing-voice precision).
  //    YIN's difference function is ~0 at EVERY integer multiple of the true
  //    period, so absoluteThreshold (scanning upward from minTau) can lock onto
  //    a HARMONIC's period instead of the fundamental — reporting one or more
  //    octaves too HIGH. This is THE precision complaint: breathy/tense
  //    phonation and certain vowels mask the fundamental so the 2nd harmonic's
  //    dip is the first one below threshold, and the tuner shows the wrong note.
  //
  //    Discriminator: the true fundamental sits at k*tau (k=2,3...) and has a
  //    LOWER yin value than the chosen harmonic dip. For a clean tone, tau is
  //    already the fundamental and yin[2*tau] ≈ yin[tau] (both ~0, multiples),
  //    so the gap is ~0 and we don't shift. For a masked fundamental, yin[tau]
  //    (the harmonic) is clearly worse than yin[2*tau] (the true period), so
  //    the gap exceeds the margin and we shift down. Iterating catches a
  //    fundamental masked by the 4th harmonic (two octaves up) too.
  const OCTAVE_SHIFT_MARGIN = 0.05;
  let chosenTau = tauEstimate;
  for (let iter = 0; iter < 2; iter++) {
    const tauDown = chosenTau * 2;            // one octave LOWER in pitch
    if (tauDown < maxTau && yin[tauDown] < yin[chosenTau] - OCTAVE_SHIFT_MARGIN) {
      chosenTau = tauDown;
      continue;
    }
    break;
  }
  // Rarer over-high report (absoluteThreshold settled too low): shift UP one
  // octave only if tau/2 is a meaningfully better dip. Checked after the down
  // pass so a masked fundamental doesn't get yanked back up.
  const tauUp = Math.floor(chosenTau / 2);
  if (tauUp >= minTau && yin[tauUp] < yin[chosenTau] - OCTAVE_SHIFT_MARGIN) {
    chosenTau = tauUp;
  }

  const betterTau = parabolicInterpolation(yin, chosenTau);
  const frequency = sampleRate / betterTau;

  // Confidence: 1 - yin value at the chosen tau (lower yin = more confident)
  const confidence = Math.max(0, Math.min(1, 1 - yin[chosenTau]));

  if (frequency < minFreq || frequency > maxFreq) {
    return { frequency: 0, confidence: 0, rms };
  }

  return { frequency, confidence, rms };
}

/**
 * Helper: detect pitch on a frame from a continuous stream.
 * Uses a sliding window approach — caller passes the latest N samples.
 */
export function detectPitchOnFrame(
  buffer: Float32Array,
  sampleRate: number = DEFAULT_SAMPLE_RATE,
  a4: number = 440,
  threshold: number = DEFAULT_THRESHOLD,
): YinResult & { midi: number; cents: number } {
  const result = detectPitchYin(buffer, sampleRate, threshold);
  if (result.frequency === 0) {
    return { ...result, midi: 0, cents: 0 };
  }
  const midi = 69 + 12 * Math.log2(result.frequency / a4);
  const nearest = Math.round(midi);
  const cents = Math.round((midi - nearest) * 100);
  return { ...result, midi, cents };
}
