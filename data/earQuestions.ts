import type { EarQuestion, EarQuestionType } from '../types';
import { SCALES, CHORD_TYPES, INTERVALS } from '../services/theoryService';

// Helper: pick a deterministic random item with a seed
function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seed * arr.length) % arr.length];
}

function rand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ── Reverse lookups: option string → definition object ──
// Option strings are the human-readable .name of an interval/scale/chord, so to
// play an alternative we map the name back to its semitone intervals.
function intervalByName(name: string) {
  return Object.values(INTERVALS).find(i => i.name === name);
}
function scaleByName(name: string) {
  return Object.values(SCALES).find(s => s.name === name);
}
function chordByName(name: string) {
  return Object.values(CHORD_TYPES).find(c => c.name === name);
}

/**
 * Build the reference audioSequence for a single option (alternative) so a
 * learner who got it wrong can audition every choice. Same root & same shape
 * as the question itself — only the interval/scale/chord differs — which makes
 * the comparison apples-to-apples.
 */
function optionAudioFor(
  type: EarQuestionType,
  optionName: string,
  rootMidi: number,
  direction: 'up' | 'down' = 'up',
): { midi: number; durationMs: number; simultaneous?: boolean }[] {
  switch (type) {
    case 'interval-melodic': {
      const iv = intervalByName(optionName);
      if (!iv) return [{ midi: rootMidi, durationMs: 700 }];
      const target = rootMidi + iv.semitones;
      return direction === 'up'
        ? [{ midi: rootMidi, durationMs: 700 }, { midi: target, durationMs: 1000 }]
        : [{ midi: target, durationMs: 700 }, { midi: rootMidi, durationMs: 1000 }];
    }
    case 'interval-harmonic': {
      const iv = intervalByName(optionName);
      if (!iv) return [{ midi: rootMidi, durationMs: 1500, simultaneous: true }];
      const target = rootMidi + iv.semitones;
      return [
        { midi: rootMidi, durationMs: 1500, simultaneous: true },
        { midi: target, durationMs: 1500, simultaneous: true },
      ];
    }
    case 'scale-identify': {
      const sc = scaleByName(optionName);
      if (!sc) return [{ midi: rootMidi, durationMs: 400 }];
      return sc.intervals.map((interval, i) => ({
        midi: rootMidi + interval,
        durationMs: i === sc.intervals.length - 1 ? 700 : 400,
      }));
    }
    case 'chord-identify': {
      const ch = chordByName(optionName);
      if (!ch) return [{ midi: rootMidi, durationMs: 1800, simultaneous: true }];
      return ch.intervals.map(interval => ({
        midi: rootMidi + interval,
        durationMs: 1800,
        simultaneous: true,
      }));
    }
    default:
      return [{ midi: rootMidi, durationMs: 700 }];
  }
}

/** Build the per-option audio map for a question's option list. */
function buildOptionAudios(
  type: EarQuestionType,
  options: string[],
  rootMidi: number,
  direction: 'up' | 'down' = 'up',
): Record<string, { midi: number; durationMs: number; simultaneous?: boolean }[]> {
  const map: Record<string, { midi: number; durationMs: number; simultaneous?: boolean }[]> = {};
  for (const opt of options) {
    map[opt] = optionAudioFor(type, opt, rootMidi, direction);
  }
  return map;
}

// ── Interval (melodic) question generator ──
export function makeIntervalMelodic(level: EarQuestion['level'], seed: number, rangeCenterMidi?: number): EarQuestion {
  const intervalsByLevel: Record<EarQuestion['level'], string[]> = {
    beginner: ['unison', 'min3', 'maj3', 'p4', 'p5', 'octave'],
    intermediate: ['min2', 'maj2', 'min3', 'maj3', 'p4', 'tritone', 'p5', 'min6', 'maj6', 'min7', 'maj7', 'octave'],
    advanced: ['min2', 'maj2', 'min3', 'maj3', 'p4', 'tritone', 'p5', 'min6', 'maj6', 'min7', 'maj7', 'octave', 'min9', 'maj9'],
  };
  const intervalKey = pick(intervalsByLevel[level], rand(seed));
  const interval = INTERVALS[intervalKey];
  // Root: sit at the singer's range center when known, else the legacy C4..F#4.
  const baseRoot = rangeCenterMidi != null ? Math.round(rangeCenterMidi) : 60 + Math.floor(rand(seed + 1) * 7);
  const rootMidi = baseRoot;
  const targetMidi = rootMidi + interval.semitones;
  const direction = rand(seed + 2) > 0.5 ? 'up' : 'down';
  const seq = direction === 'up'
    ? [{ midi: rootMidi, durationMs: 700 }, { midi: targetMidi, durationMs: 1000 }]
    : [{ midi: targetMidi, durationMs: 700 }, { midi: rootMidi, durationMs: 1000 }];

  // distractors: 3 wrong interval names
  const allNames = Object.values(INTERVALS).map(i => i.name);
  const options = [interval.name];
  while (options.length < 4) {
    const candidate = pick(allNames.filter(n => !options.includes(n)), rand(seed + options.length));
    options.push(candidate);
  }
  // shuffle deterministically
  const shuffled = [...options].sort((a, b) => (rand(seed + a.charCodeAt(0)) - 0.5));
  return {
    id: `interval-mel-${level}-${seed}`,
    type: 'interval-melodic',
    audioSequence: seq,
    optionAudios: buildOptionAudios('interval-melodic', shuffled, rootMidi, direction),
    rootMidi,
    options: shuffled,
    answer: interval.name,
    level,
    xp: level === 'beginner' ? 15 : level === 'intermediate' ? 25 : 35,
  };
}

// ── Interval (harmonic) ──
export function makeIntervalHarmonic(level: EarQuestion['level'], seed: number, rangeCenterMidi?: number): EarQuestion {
  const intervalsByLevel: Record<EarQuestion['level'], string[]> = {
    beginner: ['maj3', 'p5', 'octave', 'p4'],
    intermediate: ['min3', 'maj3', 'p4', 'tritone', 'p5', 'maj6', 'octave'],
    advanced: ['min2', 'maj2', 'min3', 'maj3', 'p4', 'tritone', 'p5', 'min6', 'maj6', 'min7', 'maj7', 'octave'],
  };
  const intervalKey = pick(intervalsByLevel[level], rand(seed));
  const interval = INTERVALS[intervalKey];
  const rootMidi = rangeCenterMidi != null ? Math.round(rangeCenterMidi) : 60 + Math.floor(rand(seed + 1) * 7);
  const targetMidi = rootMidi + interval.semitones;

  const allNames = Object.values(INTERVALS).map(i => i.name);
  const options = [interval.name];
  while (options.length < 4) {
    const candidate = pick(allNames.filter(n => !options.includes(n)), rand(seed + options.length));
    options.push(candidate);
  }
  const shuffled = [...options].sort((a, b) => (rand(seed + a.charCodeAt(0)) - 0.5));
  return {
    id: `interval-harm-${level}-${seed}`,
    type: 'interval-harmonic',
    audioSequence: [{ midi: rootMidi, durationMs: 1500, simultaneous: true }, { midi: targetMidi, durationMs: 1500, simultaneous: true }],
    optionAudios: buildOptionAudios('interval-harmonic', shuffled, rootMidi),
    rootMidi,
    options: shuffled,
    answer: interval.name,
    level,
    xp: level === 'beginner' ? 20 : level === 'intermediate' ? 30 : 40,
  };
}

// ── Scale identification ──
export function makeScaleIdentify(level: EarQuestion['level'], seed: number, rangeCenterMidi?: number): EarQuestion {
  const scalesByLevel: Record<EarQuestion['level'], string[]> = {
    beginner: ['major', 'minorNatural', 'majorPentatonic'],
    intermediate: ['major', 'minorNatural', 'minorHarmonic', 'minorMelodic', 'majorPentatonic', 'minorPentatonic', 'blues', 'dorian'],
    advanced: Object.keys(SCALES),
  };
  const scaleKey = pick(scalesByLevel[level], rand(seed));
  const rootMidi = rangeCenterMidi != null ? Math.round(rangeCenterMidi) : 60 + Math.floor(rand(seed + 1) * 7);
  const scale = SCALES[scaleKey];
  const seq = scale.intervals.map((interval, i) => ({
    midi: rootMidi + interval,
    durationMs: i === scale.intervals.length - 1 ? 700 : 400,
  }));

  const allNames = Object.values(SCALES).map(s => s.name);
  const options = [scale.name];
  while (options.length < 4) {
    const candidate = pick(allNames.filter(n => !options.includes(n)), rand(seed + options.length));
    options.push(candidate);
  }
  const shuffled = [...options].sort((a, b) => (rand(seed + a.charCodeAt(0)) - 0.5));
  return {
    id: `scale-${level}-${seed}`,
    type: 'scale-identify',
    audioSequence: seq,
    optionAudios: buildOptionAudios('scale-identify', shuffled, rootMidi),
    rootMidi,
    options: shuffled,
    answer: scale.name,
    level,
    xp: level === 'beginner' ? 20 : level === 'intermediate' ? 35 : 50,
  };
}

// ── Chord identification ──
export function makeChordIdentify(level: EarQuestion['level'], seed: number, rangeCenterMidi?: number): EarQuestion {
  const chordsByLevel: Record<EarQuestion['level'], string[]> = {
    beginner: ['major', 'minor'],
    intermediate: ['major', 'minor', 'augmented', 'diminished', 'sus4', 'major7', 'dominant7', 'minor7'],
    advanced: Object.keys(CHORD_TYPES),
  };
  const chordKey = pick(chordsByLevel[level], rand(seed));
  const rootMidi = rangeCenterMidi != null ? Math.round(rangeCenterMidi) : 60 + Math.floor(rand(seed + 1) * 7);
  const chord = CHORD_TYPES[chordKey];
  const seq = chord.intervals.map(interval => ({
    midi: rootMidi + interval,
    durationMs: 1800,
    simultaneous: true,
  }));

  const allNames = Object.values(CHORD_TYPES).map(c => c.name);
  const options = [chord.name];
  while (options.length < 4) {
    const candidate = pick(allNames.filter(n => !options.includes(n)), rand(seed + options.length));
    options.push(candidate);
  }
  const shuffled = [...options].sort((a, b) => (rand(seed + a.charCodeAt(0)) - 0.5));
  return {
    id: `chord-${level}-${seed}`,
    type: 'chord-identify',
    audioSequence: seq,
    optionAudios: buildOptionAudios('chord-identify', shuffled, rootMidi),
    rootMidi,
    options: shuffled,
    answer: chord.name,
    level,
    xp: level === 'beginner' ? 20 : level === 'intermediate' ? 35 : 50,
  };
}

export function makeEarQuestion(type: EarQuestion['type'], level: EarQuestion['level'], seed: number, rangeCenterMidi?: number): EarQuestion {
  switch (type) {
    case 'interval-melodic': return makeIntervalMelodic(level, seed, rangeCenterMidi);
    case 'interval-harmonic': return makeIntervalHarmonic(level, seed, rangeCenterMidi);
    case 'scale-identify': return makeScaleIdentify(level, seed, rangeCenterMidi);
    case 'chord-identify': return makeChordIdentify(level, seed, rangeCenterMidi);
    default: return makeIntervalMelodic(level, seed, rangeCenterMidi);
  }
}
