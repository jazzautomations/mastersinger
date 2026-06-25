import * as Tone from 'tone';
import { midiToFrequency } from './theoryService';

// ──────────────────────────────────────────────────────────────────────────
// Audio engine for MasterSinger.
//
// Uses Tone.Transport for sample-accurate scheduling. All sequence playback
// goes through Transport.schedule() which runs on the AudioContext clock,
// not window.setTimeout (which has 4-16ms jitter and causes note stacking).
// ──────────────────────────────────────────────────────────────────────────

let synth: Tone.PolySynth | null = null;
let monoSynth: Tone.Synth | null = null;
let fx: Tone.FeedbackDelay | null = null;
let master: Tone.Gain | null = null;
let warmed = false;

let playbackGen = 0;
let droneFreq = 0;

// Transport-scheduled event IDs for cancellation
const transportEvents = new Set<number>();

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
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.3 },
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
  try {
    const ctx = Tone.getContext();
    if (ctx.state !== 'running') {
      await Tone.start();
    }
    ensureSynth();
    ensureMonoSynth();
    warmed = true;
  } catch (err) {
    console.error('[AudioService] Failed to start audio context:', err);
    await new Promise(resolve => setTimeout(resolve, 100));
    try {
      await Tone.start();
      ensureSynth();
      ensureMonoSynth();
      warmed = true;
    } catch (retryErr) {
      console.error('[AudioService] Retry also failed:', retryErr);
      throw new Error('Could not start audio. Please allow microphone access and try again.');
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
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
  window.addEventListener('touchstart', unlock, { once: false });
}

export function beginPlayback(): number {
  return ++playbackGen;
}

export function isPlaybackActive(token: number): boolean {
  return token === playbackGen;
}

/**
 * Play a single note immediately (no scheduling).
 */
export function playNote(midi: number, durationMs: number, timeOffsetMs = 0, a4 = 440): void {
  try {
    resumeIfSuspended();
    const s = ensureSynth();
    const freq = midiToFrequency(midi, a4);
    const durSec = Math.max(0.05, durationMs / 1000);

    if (timeOffsetMs > 0) {
      // Use Transport.schedule for precise timing instead of setTimeout
      const token = playbackGen;
      const sec = timeOffsetMs / 1000;
      const id = Tone.Transport.schedule((time) => {
        if (!isPlaybackActive(token)) return;
        s.triggerAttackRelease(freq, durSec, time);
      }, `+${sec}`);
      transportEvents.add(id);
      return;
    }

    s.triggerAttackRelease(freq, durSec);
  } catch (err) {
    console.warn('[AudioService] playNote failed:', err);
  }
}

export function playChord(midis: number[], durationMs: number, a4 = 440): void {
  try {
    resumeIfSuspended();
    const s = ensureSynth();
    const freqs = midis.map(m => midiToFrequency(m, a4));
    s.triggerAttackRelease(freqs, durationMs / 1000);
  } catch (err) {
    console.warn('[AudioService] playChord failed:', err);
  }
}

export function playSequence(midis: number[], noteDurationMs: number, gapMs = 50, a4 = 440): void {
  resumeIfSuspended();
  ensureSynth();
  beginPlayback();
  midis.forEach((midi, i) => {
    playNote(midi, noteDurationMs - gapMs, i * noteDurationMs, a4);
  });
}

/**
 * Play a scale/arpeggio: monophonic, one note at a time.
 * Releases previous note before attacking next — no stacking.
 */
export function playScale(midis: number[], noteDurationMs: number, a4 = 440): void {
  resumeIfSuspended();
  const s = ensureMonoSynth();
  beginPlayback();
  const token = playbackGen;
  const noteSec = noteDurationMs / 1000;
  const gapSec = 0.03; // 30ms gap between notes

  // Stop any previous drone/mono sound
  s.triggerRelease();

  midis.forEach((midi, i) => {
    const sec = i * noteSec;
    const id = Tone.Transport.schedule((time) => {
      if (!isPlaybackActive(token)) {
        s.triggerRelease(time);
        return;
      }
      const freq = midiToFrequency(midi, a4);
      // Release previous, attack new
      s.triggerRelease(time);
      s.triggerAttack(freq, time);
      // Schedule release for this note (except last)
      if (i < midis.length - 1) {
        const releaseTime = time + noteSec - gapSec;
        s.triggerRelease(releaseTime);
      } else {
        // Last note: hold briefly then release
        s.triggerRelease(time + noteSec * 0.8);
      }
    }, `+${sec}`);
    transportEvents.add(id);
  });

  // Start Transport if not already running
  if (Tone.Transport.state !== 'started') {
    Tone.Transport.start();
  }
}

export function playDrone(midi: number, a4 = 440): Tone.Synth | null {
  try {
    resumeIfSuspended();
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
 * Silence everything: bump generation, cancel Transport events, release synths.
 */
export function stopAll(): void {
  try {
    playbackGen++;
    // Cancel all Transport-scheduled events
    for (const id of transportEvents) {
      Tone.Transport.clear(id);
    }
    transportEvents.clear();
    // Stop Transport (will be restarted by next playScale)
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    // Release all voices
    if (synth) synth.releaseAll();
    if (monoSynth) {
      monoSynth.triggerRelease();
      droneFreq = 0;
    }
  } catch (err) {
    console.warn('[AudioService] stopAll failed:', err);
    playbackGen++;
    transportEvents.clear();
    droneFreq = 0;
  }
}
