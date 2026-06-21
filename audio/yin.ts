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

/**
 * Step 1+2: Difference function + cumulative mean normalized difference.
 * Returns d'[tau] for tau in [0, maxTau].
 */
function difference(buffer: Float32Array, maxTau: number): Float32Array {
  const diff = new Float32Array(maxTau);
  for (let tau = 1; tau < maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < maxTau; i++) {
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
 * Step 3: Absolute threshold. Find the smallest tau where yin[tau] < threshold,
 * and yin stays below threshold for a small window after.
 */
function absoluteThreshold(yin: Float32Array, threshold: number): number {
  let tau = 2;
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
  // No tau below threshold — return global min as fallback
  let minTau = 2;
  let minVal = yin[2];
  for (let i = 3; i < yin.length; i++) {
    if (yin[i] < minVal) {
      minVal = yin[i];
      minTau = i;
    }
  }
  // if even the global min is very high, signal no pitch
  return minVal > 0.6 ? -1 : minTau;
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
  minFreq: number = 70,
  maxFreq: number = 1200,
): YinResult {
  // RMS gate — silence detection
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  const rms = Math.sqrt(sum / buffer.length);
  if (rms < 0.005) {
    return { frequency: 0, confidence: 0, rms };
  }

  const minTau = Math.floor(sampleRate / maxFreq);
  const maxTau = Math.min(Math.floor(sampleRate / minFreq), buffer.length - 1);
  if (maxTau <= minTau) return { frequency: 0, confidence: 0, rms };

  // YIN works on a window of 2 * maxTau samples
  const windowSize = 2 * maxTau;
  const window = buffer.subarray(0, Math.min(windowSize, buffer.length));
  const yin = difference(window, maxTau);

  const tauEstimate = absoluteThreshold(yin, threshold);
  if (tauEstimate === -1) {
    return { frequency: 0, confidence: 0, rms };
  }

  const betterTau = parabolicInterpolation(yin, tauEstimate);
  const frequency = sampleRate / betterTau;

  // Confidence: 1 - yin value at the chosen tau (lower yin = more confident)
  const confidence = Math.max(0, Math.min(1, 1 - yin[tauEstimate]));

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
