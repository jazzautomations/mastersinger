import * as Tone from 'tone';
import { midiToFrequency } from './theoryService';

let synth: Tone.PolySynth | null = null;
let monoSynth: Tone.Synth | null = null;
let reverb: Tone.Reverb | null = null;

function ensureSynth(): Tone.PolySynth {
  if (!synth) {
    reverb = new Tone.Reverb({ decay: 1.8, wet: 0.18 }).toDestination();
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.4 },
      volume: -10,
    }).connect(reverb);
    synth.maxPolyphony = 6;
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

export async function ensureAudioStarted(): Promise<void> {
  if (Tone.getContext().state !== 'running') {
    await Tone.start();
  }
}

export function playNote(midi: number, durationMs: number, timeOffsetMs = 0, a4 = 440): void {
  const s = ensureSynth();
  const freq = midiToFrequency(midi, a4);
  const now = Tone.now() + timeOffsetMs / 1000;
  s.triggerAttackRelease(freq, Math.max(0.05, durationMs / 1000 - 0.05), now);
}

export function playChord(midis: number[], durationMs: number, a4 = 440): void {
  const s = ensureSynth();
  const freqs = midis.map(m => midiToFrequency(m, a4));
  s.triggerAttackRelease(freqs, durationMs / 1000, Tone.now());
}

export function playSequence(midis: number[], noteDurationMs: number, gapMs = 50): void {
  ensureSynth();
  midis.forEach((midi, i) => {
    playNote(midi, noteDurationMs - gapMs, i * noteDurationMs);
  });
}

export function playDrone(midi: number, a4 = 440): Tone.Synth | null {
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
