import * as Tone from 'tone';
import { midiToFrequency } from './theoryService';

// ──────────────────────────────────────────────────────────────────────────
// Audio engine for MasterSinger.
//
// Key robustness rules (these fix the "no sound" / "notes pile up" bugs):
//   1. The Web Audio context starts SUSPENDED until a user gesture. Every play
//      function calls resumeIfSuspended() so audio works even if the caller
//      forgot to await ensureAudioStarted() first.
//   2. We do NOT use Tone.Reverb — it generates its impulse response
//      asynchronously (OfflineAudioContext) and silently blocks the signal
//      chain until ready, which is the #1 cause of "first notes don't play".
//      A sync Tone.FeedbackDelay gives ambience without that pitfall.
//   3. synths are created lazily and reused; stopAll() releases everything.
// ──────────────────────────────────────────────────────────────────────────

let synth: Tone.PolySynth | null = null;
let monoSynth: Tone.Synth | null = null;
let fx: Tone.FeedbackDelay | null = null;
let warmed = false;

function ensureSynth(): Tone.PolySynth {
  if (!synth) {
    // Sync feedback delay — no async impulse generation, never blocks audio.
    fx = new Tone.FeedbackDelay({ delayTime: 0.18, feedback: 0.18, wet: 0.12 }).toDestination();
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.4 },
      volume: -10,
    }).connect(fx);
    synth.maxPolyphony = 8;
  }
  return synth;
}

function ensureMonoSynth(): Tone.Synth {
  if (!monoSynth) {
    monoSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.4 },
      volume: -12,
    }).toDestination();
  }
  return monoSynth;
}

/**
 * Kick off a context resume if it's suspended. Non-blocking: returns the
 * promise but callers don't need to await it. Once resumed, Tone.now() starts
 * advancing and any scheduled notes fire. Safe to call on every play.
 */
function resumeIfSuspended(): void {
  const ctx = Tone.getContext();
  if (ctx.state !== 'running') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Ensure the audio context is running. Await this from inside a user-gesture
 * handler for the most reliable unlock (Safari/iOS require it in the gesture
 * stack). Returns once running.
 */
export async function ensureAudioStarted(): Promise<void> {
  const ctx = Tone.getContext();
  if (ctx.state !== 'running') {
    await Tone.start();
  }
  // make sure synths exist so the first real note has zero setup latency
  ensureSynth();
  ensureMonoSynth();
  warmed = true;
}

/**
 * One-time global gesture listener that resumes the audio context on the
 * first user interaction. Call once at app startup. This guarantees that any
 * later audio call (even one that skips ensureAudioStarted) finds a running
 * context, fixing the autoplay-policy silence bug across the whole app.
 */
export function warmAudioOnUserGesture(): void {
  if (warmed) return;
  const unlock = () => {
    resumeIfSuspended();
    warmed = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
  window.addEventListener('touchstart', unlock, { once: false });
}

export function playNote(midi: number, durationMs: number, timeOffsetMs = 0, a4 = 440): void {
  resumeIfSuspended();
  const s = ensureSynth();
  const freq = midiToFrequency(midi, a4);
  const now = Tone.now() + timeOffsetMs / 1000;
  s.triggerAttackRelease(freq, Math.max(0.05, durationMs / 1000 - 0.05), now);
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
  midis.forEach((midi, i) => {
    playNote(midi, noteDurationMs - gapMs, i * noteDurationMs, a4);
  });
}

export function playDrone(midi: number, a4 = 440): Tone.Synth | null {
  resumeIfSuspended();
  const s = ensureMonoSynth();
  s.triggerAttack(midiToFrequency(midi, a4));
  return s;
}

export function stopDrone(): void {
  if (monoSynth) {
    monoSynth.triggerRelease();
  }
}

export function stopAll(): void {
  if (synth) {
    synth.releaseAll();
  }
  if (monoSynth) {
    monoSynth.triggerRelease();
  }
}
