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
let unlocked = false;
let silentEl: HTMLAudioElement | null = null;
const SILENT_WAV = 'data:audio/wav;base64,UklGRqQMAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYAMAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

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

function getRawContext(): AudioContext | null {
  try { return Tone.getContext().rawContext as unknown as AudioContext; } catch { return null; }
}

// iOS requires the first sound to originate from a user gesture: play a
// 1-sample silent buffer to satisfy that unlock.
function playSilentBuffer(): void {
  const ctx = getRawContext();
  if (!ctx) return;
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
}

// A silent, looping <audio> element. Playing an HTMLMediaElement switches the
// iOS audio session to the "playback" category, which makes Web Audio audible
// even when the ring/silent switch is SILENT — the #1 cause of "no sound on
// iPhone" — and keeps playback alive while the mic is recording.
function ensureSilentElement(): void {
  if (silentEl || typeof document === 'undefined') return;
  try {
    const el = document.createElement('audio');
    el.setAttribute('playsinline', 'true');
    el.loop = true;
    el.preload = 'auto';
    el.src = SILENT_WAV;
    el.volume = 0;
    silentEl = el;
  } catch {}
}

// Full iOS-safe unlock: resume Tone + the raw AudioContext, play a silent
// buffer, and claim the media session via the silent element. Idempotent.
export async function unlockAudio(): Promise<void> {
  try {
    const ctx = Tone.getContext();
    if (ctx.state !== 'running') { try { await Tone.start(); } catch {} }
    const raw = getRawContext();
    if (raw && raw.state !== 'running') { try { await raw.resume(); } catch {} }
    playSilentBuffer();
    ensureSilentElement();
    if (silentEl && silentEl.paused) { try { await silentEl.play(); } catch {} }
    ensureSynth();
    ensureMonoSynth();
    if (master) master.gain.rampTo(1.6, 0.02);
    unlocked = true;
    warmed = true;
  } catch (err) {
    console.warn('[AudioService] unlockAudio failed:', err);
  }
}

async function resumeIfSuspended(): Promise<void> {
  await unlockAudio();
}

export async function ensureAudioStarted(): Promise<void> {
  await unlockAudio();
  if (Tone.getContext().state !== 'running') {
    await new Promise(resolve => setTimeout(resolve, 60));
    await unlockAudio();
  }
  if (Tone.getContext().state !== 'running') {
    console.warn('[AudioService] Audio context not running after unlock attempts.');
  }
}

export function warmAudioOnUserGesture(): void {
  const unlock = () => {
    const raw = getRawContext();
    if (!unlocked || (raw && raw.state !== 'running') || (silentEl && silentEl.paused)) {
      unlockAudio();
    }
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const raw = getRawContext();
      if (raw && raw.state !== 'running') raw.resume().catch(() => {});
      if (silentEl && silentEl.paused) silentEl.play().catch(() => {});
    });
  }
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
