import * as Tone from 'tone';
import { midiToFrequency } from './theoryService';

// ──────────────────────────────────────────────────────────────────────────
// Audio engine for MasterSinger.
//
// Uses setTimeout with generation-token cancellation. playScale uses
// monoSynth with release-before-attack to prevent note stacking.
// Chords use individual Tone.Synth instances (not PolySynth) to avoid
// PolySynth's unreliable releaseAll behavior.
// ──────────────────────────────────────────────────────────────────────────

let synth: Tone.PolySynth | null = null;
let monoSynth: Tone.Synth | null = null;
let fx: Tone.FeedbackDelay | null = null;
let master: Tone.Gain | null = null;
let warmed = false;

let playbackGen = 0;
let droneFreq = 0;

const scheduledTimeouts = new Set<number>();

// Individual synths (bypassing PolySynth's unreliable release)
const activeSynths = new Set<Tone.Synth>();

let limiter: Tone.Limiter | null = null;
function ensureMaster(): Tone.Gain {
  if (!master) {
    limiter = new Tone.Limiter(-1).toDestination();
    master = new Tone.Gain(1.6).connect(limiter);
  }
  return master;
}

function ensureFx(): Tone.FeedbackDelay {
  if (!fx) {
    const out = ensureMaster();
    fx = new Tone.FeedbackDelay({ delayTime: 0.18, feedback: 0.18, wet: 0.12 }).connect(out);
  }
  return fx;
}

function ensureSynth(): Tone.PolySynth {
  if (!synth) {
    const delay = ensureFx();
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.3 },
      volume: -3,
    }).connect(delay);
    synth.maxPolyphony = 8;
  }
  return synth;
}

function ensureMonoSynth(): Tone.Synth {
  if (!monoSynth) {
    const out = ensureMaster();
    monoSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.6, release: 0.15 },
      volume: -3,
    }).connect(out);
  }
  return monoSynth;
}

async function resumeIfSuspended(): Promise<void> {
  const ctx = Tone.getContext();
  if (ctx.state !== 'running') {
    try {
      await Tone.start();
    } catch {
      console.warn('[AudioService] Could not resume audio context. Try interacting with the page first.');
    }
  }
}

export async function ensureAudioStarted(): Promise<void> {
  try {
    const ctx = Tone.getContext();
    if (ctx.state !== 'running') {
      await Tone.start();
    }
    ensureSynth();
    ensureMonoSynth();
    // Restore master gain if it was muted by stopAll
    if (master) master.gain.rampTo(1.6, 0.02);
    warmed = true;
  } catch (err) {
    console.error('[AudioService] Failed to start audio context:', err);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      await Tone.start();
      ensureSynth();
      ensureMonoSynth();
      if (master) master.gain.rampTo(1.6, 0.02);
      warmed = true;
    } catch (retryErr) {
      console.error('[AudioService] Retry also failed:', retryErr);
      throw new Error('Could not start audio. Please interact with the page (click/tap) and try again.');
    }
  }
}

export function warmAudioOnUserGesture(): void {
  if (warmed) return;
  const unlock = () => {
    Tone.start().catch(() => {});
    ensureSynth();
    ensureMonoSynth();
    warmed = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
}

export function beginPlayback(): number {
  return ++playbackGen;
}

export function isPlaybackActive(token: number): boolean {
  return token === playbackGen;
}

export function playNote(midi: number, durationMs: number, timeOffsetMs = 0, a4 = 440): void {
  try {
    const freq = midiToFrequency(midi, a4);
    const durSec = Math.max(0.05, durationMs / 1000);
    const token = playbackGen;

    // Restore master gain if it was muted by stopAll
    if (master) master.gain.rampTo(1.6, 0.02);

    const doPlay = () => {
      if (!isPlaybackActive(token)) return;
      try {
        const s = new Tone.Synth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.3 },
          volume: -3,
        }).connect(ensureFx());

        s.triggerAttackRelease(freq, durSec);
        activeSynths.add(s);

        // Auto-cleanup ~500ms after note should have ended
        const cleanupId = window.setTimeout(() => {
          activeSynths.delete(s);
          try { s.dispose(); } catch {}
        }, durSec * 1000 + 500);
        scheduledTimeouts.add(cleanupId);
      } catch (e) {
        console.warn('[AudioService] playNote failed:', e);
      }
    };

    if (timeOffsetMs > 0) {
      const id = window.setTimeout(() => {
        scheduledTimeouts.delete(id);
        doPlay();
      }, timeOffsetMs);
      scheduledTimeouts.add(id);
      return;
    }

    doPlay();
  } catch (err) {
    console.warn('[AudioService] playNote failed:', err);
  }
}

export function playChord(midis: number[], durationMs: number, a4 = 440): void {
  try {
    const durSec = Math.max(0.05, durationMs / 1000);
    const token = playbackGen;
    if (!isPlaybackActive(token)) return;

    // Restore master gain if it was muted by stopAll
    if (master) master.gain.rampTo(1.6, 0.02);

    // Individual Tone.Synth per note (no PolySynth) — each triggerAttackRelease
    // schedules its own reliable release, no infinite sustain.
    const delay = ensureFx();
    midis.forEach(m => {
      if (!isPlaybackActive(token)) return;
      const s = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.3 },
        volume: -3,
      }).connect(delay);

      s.triggerAttackRelease(midiToFrequency(m, a4), durSec);
      activeSynths.add(s);

      // Auto-cleanup ~500ms after note should have ended
      const cleanupId = window.setTimeout(() => {
        activeSynths.delete(s);
        try { s.dispose(); } catch {}
      }, durSec * 1000 + 500);
      scheduledTimeouts.add(cleanupId);
    });
  } catch (err) {
    console.warn('[AudioService] playChord failed:', err);
  }
}

export function playSequence(midis: number[], noteDurationMs: number, gapMs = 50, a4 = 440): void {
  if (noteDurationMs <= gapMs) {
    console.warn('[AudioService] playSequence: noteDurationMs must be > gapMs');
    return;
  }
  const dur = noteDurationMs - gapMs;
  midis.forEach((midi, i) => {
    playNote(midi, dur, i * noteDurationMs, a4);
  });
}

/**
 * Play a scale/arpeggio: monophonic, one note at a time.
 * Releases previous note before attacking next — no stacking.
 * Uses setTimeout chain with generation-token cancellation.
 */
export function playScale(midis: number[], noteDurationMs: number, a4 = 440): void {
  resumeIfSuspended();
  const s = ensureMonoSynth();
  const token = beginPlayback();
  const noteMs = Math.max(80, noteDurationMs); // minimum 80ms per note
  const gapMs = 20; // gap between notes for clean release

  // Release any sustaining note
  s.triggerRelease();

  midis.forEach((midi, i) => {
    const delay = i * noteMs;
    const id = window.setTimeout(() => {
      scheduledTimeouts.delete(id);
      if (!isPlaybackActive(token)) {
        s.triggerRelease();
        return;
      }
      const freq = midiToFrequency(midi, a4);
      // Attack new note
      s.triggerAttack(freq);
      // Schedule release (except last note)
      if (i < midis.length - 1) {
        const releaseId = window.setTimeout(() => {
          scheduledTimeouts.delete(releaseId);
          if (isPlaybackActive(token)) s.triggerRelease();
        }, noteMs - gapMs);
        scheduledTimeouts.add(releaseId);
      } else {
        // Last note: hold then release
        const releaseId = window.setTimeout(() => {
          scheduledTimeouts.delete(releaseId);
          if (isPlaybackActive(token)) s.triggerRelease();
        }, noteMs * 0.7);
        scheduledTimeouts.add(releaseId);
      }
    }, delay);
    scheduledTimeouts.add(id);
  });
}

export function playDrone(midi: number, a4 = 440): Tone.Synth | null {
  try {
    if (master) master.gain.rampTo(1.6, 0.02);
    const s = ensureMonoSynth();
    const freq = midiToFrequency(midi, a4);
    if (droneFreq === freq) return s;
    if (droneFreq !== 0) s.triggerRelease();
    s.triggerAttack(freq);
    droneFreq = freq;
    return s;
  } catch (err) {
    console.warn('[AudioService] playDrone failed:', err);
    return null;
  }
}

export function stopDrone(): void {
  if (monoSynth && droneFreq !== 0) {
    monoSynth.triggerRelease();
    droneFreq = 0;
  }
}

/**
 * Silence everything: bump generation, cancel timeouts, release synths.
 * Disposes the PolySynth to guarantee all old voices are gone.
 */
export function stopAll(): void {
  playbackGen++;
  for (const id of scheduledTimeouts) {
    clearTimeout(id);
  }
  scheduledTimeouts.clear();

  // Dispose the PolySynth so old sustaining voices are completely gone.
  // A fresh one is created on next play via ensureSynth().
  try {
    if (synth) {
      synth.dispose();
    }
  } catch {}
  synth = null;
  try {
    if (monoSynth) { monoSynth.triggerRelease(); monoSynth.dispose(); monoSynth = null; }
  } catch {}

  // Stop all individual synths (from playNote)
  for (const s of activeSynths) {
    try { s.triggerRelease(); } catch {}
    try { s.dispose(); } catch {}
  }
  activeSynths.clear();

  droneFreq = 0;

  // Mute master gain — guaranteed silence
  if (master) {
    master.gain.value = 0;
  }
}
