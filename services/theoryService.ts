// ──────────────────────────────────────────────────────────────────────────
// Music theory helpers — note names, MIDI conversions, scales, intervals
// ──────────────────────────────────────────────────────────────────────────

import type { VoiceType, Exercise } from '../types';

export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const A4 = 440;

export function midiToFrequency(midi: number, a4: number = A4): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidi(freq: number, a4: number = A4): number {
  if (freq <= 0) return 0;
  return 69 + 12 * Math.log2(freq / a4);
}

export function midiToNoteName(midi: number, useFlats = false): string {
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  const pc = ((rounded % 12) + 12) % 12;
  const name = useFlats ? NOTE_NAMES_FLAT[pc] : NOTE_NAMES_SHARP[pc];
  return `${name}${octave}`;
}

export function midiToCents(freq: number, a4: number = A4): number {
  if (freq <= 0) return 0;
  const midi = frequencyToMidi(freq, a4);
  const nearest = Math.round(midi);
  return Math.round((midi - nearest) * 100);
}

// ── Scale definitions ──
// intervals are semitone offsets from the root
export const SCALES: Record<string, { name: string; intervals: number[]; category: string }> = {
  major:              { name: 'Major',                intervals: [0, 2, 4, 5, 7, 9, 11, 12], category: 'Diatonic' },
  minorNatural:       { name: 'Minor (Natural)',      intervals: [0, 2, 3, 5, 7, 8, 10, 12], category: 'Diatonic' },
  minorHarmonic:      { name: 'Minor (Harmonic)',     intervals: [0, 2, 3, 5, 7, 8, 11, 12], category: 'Diatonic' },
  minorMelodic:       { name: 'Minor (Melodic)',      intervals: [0, 2, 3, 5, 7, 9, 11, 12], category: 'Diatonic' },
  majorPentatonic:    { name: 'Major Pentatonic',     intervals: [0, 2, 4, 7, 9, 12],        category: 'Pentatonic' },
  minorPentatonic:    { name: 'Minor Pentatonic',     intervals: [0, 3, 5, 7, 10, 12],       category: 'Pentatonic' },
  blues:              { name: 'Blues',                intervals: [0, 3, 5, 6, 7, 10, 12],    category: 'Blues' },
  dorian:             { name: 'Dorian',               intervals: [0, 2, 3, 5, 7, 9, 10, 12], category: 'Mode' },
  phrygian:           { name: 'Phrygian',             intervals: [0, 1, 3, 5, 7, 8, 10, 12], category: 'Mode' },
  lydian:             { name: 'Lydian',               intervals: [0, 2, 4, 6, 7, 9, 11, 12], category: 'Mode' },
  mixolydian:         { name: 'Mixolydian',           intervals: [0, 2, 4, 5, 7, 9, 10, 12], category: 'Mode' },
  locrian:            { name: 'Locrian',              intervals: [0, 1, 3, 5, 6, 8, 10, 12], category: 'Mode' },
  chromatic:          { name: 'Chromatic',            intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], category: 'Other' },
  wholeTone:          { name: 'Whole Tone',           intervals: [0, 2, 4, 6, 8, 10, 12],    category: 'Other' },
};

export const ARPEGGIO_TYPES: Record<string, { name: string; intervals: number[] }> = {
  major:         { name: 'Major Triad',         intervals: [0, 4, 7, 12] },
  minor:         { name: 'Minor Triad',         intervals: [0, 3, 7, 12] },
  augmented:     { name: 'Augmented Triad',     intervals: [0, 4, 8, 12] },
  diminished:    { name: 'Diminished Triad',    intervals: [0, 3, 6, 12] },
  major7:        { name: 'Major 7',             intervals: [0, 4, 7, 11, 12] },
  dominant7:     { name: 'Dominant 7',          intervals: [0, 4, 7, 10, 12] },
  minor7:        { name: 'Minor 7',             intervals: [0, 3, 7, 10, 12] },
  minor7b5:      { name: 'Half-Diminished',     intervals: [0, 3, 6, 10, 12] },
  diminished7:   { name: 'Diminished 7',        intervals: [0, 3, 6, 9, 12] },
};

export const INTERVALS: Record<string, { name: string; semitones: number }> = {
  unison:       { name: 'Perfect Unison',   semitones: 0 },
  min2:         { name: 'Minor 2nd',        semitones: 1 },
  maj2:         { name: 'Major 2nd',        semitones: 2 },
  min3:         { name: 'Minor 3rd',        semitones: 3 },
  maj3:         { name: 'Major 3rd',        semitones: 4 },
  p4:           { name: 'Perfect 4th',      semitones: 5 },
  tritone:      { name: 'Tritone',          semitones: 6 },
  p5:           { name: 'Perfect 5th',      semitones: 7 },
  min6:         { name: 'Minor 6th',        semitones: 8 },
  maj6:         { name: 'Major 6th',        semitones: 9 },
  min7:         { name: 'Minor 7th',        semitones: 10 },
  maj7:         { name: 'Major 7th',        semitones: 11 },
  octave:       { name: 'Octave',           semitones: 12 },
  min9:         { name: 'Minor 9th',        semitones: 13 },
  maj9:         { name: 'Major 9th',        semitones: 14 },
};

// ── Build scale degrees at a root ──
export function buildScale(rootMidi: number, scaleKey: string, octaveSpan = 1): number[] {
  const scale = SCALES[scaleKey];
  if (!scale) return [rootMidi];
  const notes: number[] = [];
  for (let oct = 0; oct < octaveSpan; oct++) {
    for (let i = 0; i < scale.intervals.length; i++) {
      // Skip the root (interval 0) at the start of every octave above the
      // first: the previous octave already ended on the 12th-semitone root,
      // so emitting it again duplicates that boundary note. Only affects
      // octaveSpan > 1; the default single-octave path is unchanged.
      if (oct > 0 && i === 0) continue;
      notes.push(rootMidi + scale.intervals[i] + 12 * oct);
    }
  }
  return notes;
}

export function buildArpeggio(rootMidi: number, type: string): number[] {
  const arp = ARPEGGIO_TYPES[type];
  if (!arp) return [rootMidi];
  return arp.intervals.map(i => rootMidi + i);
}

// ── Chord playback ──
export const CHORD_TYPES: Record<string, { name: string; intervals: number[]; symbol: string }> = {
  major:      { name: 'Major',          intervals: [0, 4, 7],       symbol: '' },
  minor:      { name: 'Minor',          intervals: [0, 3, 7],       symbol: 'm' },
  augmented:  { name: 'Augmented',      intervals: [0, 4, 8],       symbol: '+' },
  diminished: { name: 'Diminished',     intervals: [0, 3, 6],       symbol: '°' },
  sus4:       { name: 'Suspended 4th',  intervals: [0, 5, 7],       symbol: 'sus4' },
  major7:     { name: 'Major 7',        intervals: [0, 4, 7, 11],   symbol: 'maj7' },
  dominant7:  { name: 'Dominant 7',     intervals: [0, 4, 7, 10],   symbol: '7' },
  minor7:     { name: 'Minor 7',        intervals: [0, 3, 7, 10],   symbol: 'm7' },
};

// ── Voice classification + range-aware transposition ──

/**
 * Classify a singer's voice type from their detected range (lowest & highest
 * MIDI notes). Uses the comfortable middle of the range as the primary signal,
 * which is more stable than either extreme alone (people undershoot/overshoot
 * the true ceiling/floor). Falls back to the lowest note when the midpoint is
 * ambiguous. MIDI anchors (C4=60, A4=69):
 *   Bass      lowest ~ C2(36)  center ~ G2(43)
 *   Baritone  lowest ~ G2(43)  center ~ D3(50)
 *   Tenor     lowest ~ C3(48)  center ~ G3(55)
 *   Alto      lowest ~ G3(55)  center ~ D4(62)
 *   Mezzo     lowest ~ A3(57)  center ~ E4(64)
 *   Soprano   lowest ~ C4(60)  center ~ A4(69)
 */
export function classifyVoiceType(lowestMidi: number, highestMidi: number): VoiceType {
  if (!Number.isFinite(lowestMidi) || !Number.isFinite(highestMidi) || highestMidi < lowestMidi) {
    return 'unknown';
  }
  const center = (lowestMidi + highestMidi) / 2;
  // Decide primarily on the lowest comfortable note ( tessitura floor ),
  // refined by the midpoint. Soprano/mezzo are very close on the floor, so the
  // center breaks the tie (soprano centers higher).
  if (lowestMidi >= 59) return center >= 66 ? 'soprano' : 'mezzo';   // floor ~ A3/B3 and up
  if (lowestMidi >= 54) return 'alto';                                // floor ~ Gb3..Ab3
  if (lowestMidi >= 47) return 'tenor';                               // floor ~ B2..Gb3
  if (lowestMidi >= 41) return 'baritone';                            // floor ~ F2..Ab2
  return 'bass';                                                       // floor below F2
}

/**
 * Semitone offset that moves `sourceCenterMidi` onto `targetCenterMidi`,
 * clamped to ±18 semitones (1.5 octaves) so a wildly-misdetected range never
 * shoves an exercise into bat-only or dog-only territory.
 */
export function transposeOffset(sourceCenterMidi: number, targetCenterMidi: number | undefined): number {
  if (targetCenterMidi == null || !Number.isFinite(targetCenterMidi)) return 0;
  const raw = Math.round(targetCenterMidi - sourceCenterMidi);
  return Math.max(-18, Math.min(18, raw));
}

/** Geometric-ish center (arithmetic mean of min & max) of a set of MIDI notes. */
export function centerOfMidis(midis: number[]): number {
  if (midis.length === 0) return 60;
  const min = Math.min(...midis);
  const max = Math.max(...midis);
  return (min + max) / 2;
}

/**
 * Return a NEW Exercise with every target transposed by `offset` semitones.
 * Pure: leaves the original exercise object untouched. Used so practice scales
 * sit in the singer's detected range instead of a fixed C4.
 */
export function transposeExercise(ex: Exercise, offset: number): Exercise {
  if (offset === 0) return ex;
  return {
    ...ex,
    targets: ex.targets.map(t => ({ ...t, midi: t.midi + offset })),
  };
}

// ── Helpers ──
export function todayISO(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function weekStartISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday = 7
  d.setDate(d.getDate() - day + 1);
  return todayISO(d);
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00');
  const db = new Date(b + 'T00:00:00');
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}
