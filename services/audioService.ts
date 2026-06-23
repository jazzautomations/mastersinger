import * as Tone from 'tone';
import { midiToFrequency } from './theoryService';

// ──────────────────────────────────────────────────────────────────────────
// Audio engine for MasterSinger.
//
// Robustness rules (these fix the overlap / infinite-sound / no-sound bugs):
//   1. Web Audio context starts SUSPENDED until a user gesture. Every play
//      function calls resumeIfSuspended() so audio works even if the caller
//      forgot to await ensureAudioStarted() first.
//   2. We do NOT use Tone.Reverb — it generates its impulse response
//      asynchronously (OfflineAudioContext) and silently blocks the signal
//      chain until ready. A sync Tone.FeedbackDelay gives ambience safely.
//   3. PLAYBACK GENERATION TOKEN: every time you start a new sequence/scale/
//      progression, call beginPlayback() to get a token. The scheduled notes
//      must check isPlaybackActive(token) before firing. stopAll() bumps the
//      generation, instantly invalidating ALL outstanding scheduled notes —
//      so clicking "Play" again never stacks two sequences on top of each other.
//   4. DRONE is idempotent: re-attacking the same frequency is a no-op;
//      attacking a new frequency releases the old one first. No infinite drones.
//   5. MASTER GAIN: every synth routes through one GainNode → destination.
//      Phone speakers (especially iPhone) need a strong, predictable level;
//      the individual synth.volume knobs alone left output too quiet. The
//      master sits near unity so the synth levels are the audible ceiling.
// ──────────────────────────────────────────────────────────────────────────

let synth: Tone.PolySynth | null = null;
let monoSynth: Tone.Synth | null = null;
let fx: Tone.FeedbackDelay | null = null;
let master: Tone.Gain | null = null;
let warmed = false;

// Generation token — bumped by stopAll() so any in-flight scheduled playback
// self-cancels instead of piling on top of a fresh one.
let playbackGen = 0;
// Currently-sustaining drone frequency (0 = none). Used to make playDrone
// idempotent and prevent the "infinite drone" bug.
let droneFreq = 0;

// Pending future-scheduled note timeouts (Fix 4). Notes scheduled with
// timeOffsetMs > 0 go through window.setTimeout so stopAll() can cancel them;
// Tone's absolute-time triggerAttackRelease can't be cancelled once queued, so
// a second Play used to stack a new sequence on top of the old pending notes.
const scheduledTimeouts = new Set<number>();

// Single loud, controllable output bus. Created once; every synth connects to
// it instead of toDestination() directly. Chain: synths → masterGain → limiter
// → destination. Phone speakers (iPhone especially) are quiet and clip-prone,
// so we push the master gain ABOVE unity and let a -1 dB limiter catch peaks —
// perceptibly louder without distortion. (Synth volume knobs alone left iOS
// output too quiet, the #1 "áudio baixo no iPhone" complaint.)
let limiter: Tone.Limiter | null = null;
function ensureMaster(): Tone.Gain {
  if (!master) {
    limiter = new Tone.Limiter(-1).toDestination();
    master = new Tone.Gain(1.6).connect(limiter);
  }
  return master;
}

function ensureSynth(): Tone.PolySynth {
  if (!synth) {
    const out = ensureMaster();
    fx = new Tone.FeedbackDelay({ delayTime: 0.18, feedback: 0.18, wet: 0.12 }).connect(out);
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.4 },
      volume: -3,
    }).connect(fx);
    synth.maxPolyphony = 8;
  }
  return synth;
}

function ensureMonoSynth(): Tone.Synth {
  if (!monoSynth) {
    const out = ensureMaster();
    monoSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.4 },
      volume: -3,
    }).connect(out);
  }
  return monoSynth;
}

function resumeIfSuspended(): void {
  const ctx = Tone.getContext();
  if (ctx.state !== 'running') {
    ctx.resume().catch(() => {});
  }
}

export async function ensureAudioStarted(): Promise<void> {
  const ctx = Tone.getContext();
  if (ctx.state !== 'running') {
    await Tone.start();
  }
  ensureSynth();
  ensureMonoSynth();
  warmed = true;
}

// iOS Safari only unlocks the AudioContext if the resume() call is made
// *inside* the user-gesture handler (pointerdown/touchstart/keydown), not in
// a detached async continuation. Tone.start() calls context.resume()
// synchronously at its start, so calling it directly in the listener — without
// awaiting — is what actually satisfies the autoplay policy. We also build the
// synth graph here so the first real play call has zero setup latency.
export function warmAudioOnUserGesture(): void {
  if (warmed) return;
  const unlock = () => {
    // Fire Tone.start() (which resumes the context) in-gesture, synchronously.
    // We don't await — the resume() has already been kicked off inside this
    // call stack, which is what iOS requires. Then pre-build the graph.
    Tone.start().catch(() => {});
    ensureSynth();
    ensureMonoSynth();
    warmed = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
  window.addEventListener('touchstart', unlock, { once: false });
}

/**
 * Start a new playback session. Returns a token you pass to isPlaybackActive()
 * from inside each scheduled step. Calling this (or stopAll) invalidates any
 * previously-started session, so rapid clicks never stack sequences.
 */
export function beginPlayback(): number {
  return ++playbackGen;
}

/** True only if `token` is the most recently begun playback session. */
export function isPlaybackActive(token: number): boolean {
  return token === playbackGen;
}

export function playNote(midi: number, durationMs: number, timeOffsetMs = 0, a4 = 440): void {
  resumeIfSuspended();
  const s = ensureSynth();
  const freq = midiToFrequency(midi, a4);
  const durSec = Math.max(0.05, durationMs / 1000 - 0.05);

  // Future-scheduled notes are routed through a tracked setTimeout with a
  // generation-token guard (Fix 4): stopAll() clears every pending timeout AND
  // bumps the generation so a callback that already fired self-skips. The old
  // path used Tone.now() + offset, which couldn't be cancelled. Immediate
  // plays (offset 0) keep the direct, sample-accurate path.
  if (timeOffsetMs > 0) {
    const token = playbackGen;
    const id = window.setTimeout(() => {
      scheduledTimeouts.delete(id);
      if (!isPlaybackActive(token)) return;
      resumeIfSuspended();
      s.triggerAttackRelease(freq, durSec, Tone.now());
    }, timeOffsetMs);
    scheduledTimeouts.add(id);
    return;
  }

  s.triggerAttackRelease(freq, durSec, Tone.now());
}

export function playChord(midis: number[], durationMs: number, a4 = 440): void {
  resumeIfSuspended();
  const s = ensureSynth();
  const freqs = midis.map(m => midiToFrequency(m, a4));
  s.triggerAttackRelease(freqs, durationMs / 1000, Tone.now());
}

export function playSequence(midis: number[], noteDurationMs: number, gapMs = 50, a4 = 440): void {
  resumeIfSuspended();
  ensureSynth();
  // Fresh session (Fix 4): bumps the generation so any prior sequence's
  // pending notes self-skip, and the new notes capture this token.
  beginPlayback();
  midis.forEach((midi, i) => {
    playNote(midi, noteDurationMs - gapMs, i * noteDurationMs, a4);
  });
}

/**
 * Play a sustained reference tone (drone). Idempotent: re-attacking the SAME
 * frequency is a no-op; attacking a NEW frequency releases the old one first.
 * This kills the classic "click reference 5x → 5 overlapping infinite drones".
 */
export function playDrone(midi: number, a4 = 440): Tone.Synth | null {
  resumeIfSuspended();
  const s = ensureMonoSynth();
  const freq = midiToFrequency(midi, a4);
  if (droneFreq === freq) {
    // already sustaining this exact tone — do nothing
    return s;
  }
  if (droneFreq !== 0) {
    // different tone is sustaining — release it cleanly first
    s.triggerRelease();
  }
  s.triggerAttack(freq);
  droneFreq = freq;
  return s;
}

export function stopDrone(): void {
  if (monoSynth && droneFreq !== 0) {
    monoSynth.triggerRelease();
    droneFreq = 0;
  }
}

/**
 * Silence everything and cancel any in-flight scheduled playback.
 * - bumps playbackGen so every outstanding isPlaybackActive(token) returns false
 * - releases all poly voices
 * - releases the drone
 * Call this before starting a new sequence AND on component unmount.
 */
export function stopAll(): void {
  playbackGen++; // invalidate all outstanding scheduled notes
  // Cancel every still-pending scheduled note (Fix 4): clearTimeout removes
  // it before it fires; the gen bump above also makes any already-fired
  // callback self-skip.
  for (const id of scheduledTimeouts) {
    clearTimeout(id);
  }
  scheduledTimeouts.clear();
  if (synth) {
    synth.releaseAll();
  }
  if (monoSynth && droneFreq !== 0) {
    monoSynth.triggerRelease();
    droneFreq = 0;
  }
}
