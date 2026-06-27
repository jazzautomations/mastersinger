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

// Deterministic Fisher-Yates shuffle. The old code used
// `.sort((a,b) => rand(seed + a.charCodeAt(0)) - 0.5)`, which is biased in
// two ways: a random comparator is non-transitive (V8 TimSort produces a
// non-uniform permutation), and keying only on the first charCode made
// options that share an initial letter tie and keep their original order, so
// the correct answer (pushed first) stayed first far too often. A per-index
// seeded Fisher-Yates gives a uniform, reproducible shuffle.
function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(seed + i) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Pedagogical hints shown after answering ──
const INTERVAL_HINTS: Record<string, string> = {
  'Perfect Unison':  'Mesma nota, sem distância. Uníssono perfeito.',
  'Minor 2nd':       '1 semitom — o passo mais tenso da escala cromática. Pede resolução imediata.',
  'Major 2nd':       '2 semitons — o passo de escala mais comum. Dó→Ré, Sol→Lá.',
  'Minor 3rd':       '3 semitons — o coração do acorde menor. Soa melancólico e introvertido.',
  'Major 3rd':       '4 semitons — o coração do acorde maior. Soa alegre, brilhante.',
  'Perfect 4th':     '5 semitons — intervalo estável. O Hino Nacional começa com uma 4ª justa.',
  'Tritone':         '6 semitons — o diabolus in musica. Soa tenso e instável, sempre pede resolução.',
  'Perfect 5th':     '7 semitons — a base de todo acorde. Soa aberto, poderoso e estável.',
  'Minor 6th':       '8 semitons — amplo e melancólico. Primeira nota de "The Entertainer" ao contrário.',
  'Major 6th':       '9 semitons — soa aberto e expressivo. Como o início de "My Way".',
  'Minor 7th':       '10 semitons — tenso, jazzy. A sétima dominante que quer resolver.',
  'Major 7th':       '11 semitons — o mais tenso de todos, a um semitom da oitava. Som sofisticado e suspenso.',
  'Octave':          '12 semitons — a mesma nota uma oitava acima. Perfeito, fechado, estável.',
  'Minor 9th':       '13 semitons — 2ª menor uma oitava acima. Tensão extrema.',
  'Major 9th':       '14 semitons — 2ª maior uma oitava acima. Som aberto e jazzístico.',
  'Minor 10th':      '15 semitons — 3ª menor uma oitava acima.',
  'Major 10th':      '16 semitons — 3ª maior uma oitava acima.',
  'Perfect 11th':    '17 semitons — 4ª justa uma oitava acima.',
  'Augmented 11th':  '18 semitons — trítono uma oitava acima. Soa exótico e instável.',
  'Perfect 12th':    '19 semitons — 5ª justa uma oitava acima. Base do corno, clarinete.',
  'Minor 13th':      '20 semitons — 6ª menor duas oitavas acima.',
  'Major 13th':      '21 semitons — 6ª maior duas oitavas acima. Comum em voicings de jazz.',
};

const SCALE_HINTS: Record<string, string> = {
  'Major':              'Brilhante e alegre — a escala mais comum da música tonal ocidental.',
  'Minor (Natural)':    'Melancólica e escura — usada em rock, clássico, pop emocional.',
  'Minor (Harmonic)':   'Menor com 7ª maior: o passo aumentado (3 semitons) dá cor árabe e dramática.',
  'Minor (Melodic)':    'Menor que sobe diferente de como desce. Muito usada no jazz e na música clássica.',
  'Major Pentatonic':   '5 notas da escala maior — simples e nunca soa errado. Base do folk e do pop.',
  'Minor Pentatonic':   '5 notas da escala menor — a base do blues, rock e funk.',
  'Blues':              'Pentatônica menor com blue note (trítono) — o som essencial do blues americano.',
  'Dorian':             'Como menor natural, mas com 6ª maior. Som folk, jazz e rock progressivo.',
  'Phrygian':           'Começa com semitom — exótico, dramático, muito usado no flamenco.',
  'Lydian':             'Maior com 4ª aumentada — som etéreo, mágico, muito usado em trilhas de cinema.',
  'Mixolydian':         'Maior com 7ª menor — o som do rock, do blues e do folk britânico.',
  'Locrian':            'O modo mais instável — tônica com quinta diminuta, raramente usada.',
  'Chromatic':          'Todos os 12 semitons em sequência — cromatismo puro.',
  'Whole Tone':         'Só tons inteiros, sem semitons — som flutuante e sem direção. Debussy.',
};

const CHORD_HINTS: Record<string, string> = {
  'Major':          'Alegre e estável — 3ª maior + 5ª justa. A base da harmonia tonal.',
  'Minor':          'Escuro e introspectivo — 3ª menor + 5ª justa.',
  'Augmented':      'Instável — 3ª maior + 5ª aumentada. Pede resolução.',
  'Diminished':     'Muito tenso — duas 3ªs menores empilhadas. Altamente instável.',
  'Suspended 4th':  'Suspenso — a 3ª é substituída por 4ª. Quer resolver na tônica ou na 3ª.',
  'Major 7':        'Maior com 7ª maior — som sofisticado, bossa nova, jazz suave.',
  'Dominant 7':     'Maior com 7ª menor — tensão que pede resolver na tônica. Base do blues e do jazz.',
  'Minor 7':        'Menor com 7ª menor — jazz, soul, blues, R&B.',
};

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
  const shuffled = shuffle(options, seed);
  return {
    id: `interval-mel-${level}-${seed}`,
    type: 'interval-melodic',
    audioSequence: seq,
    optionAudios: buildOptionAudios('interval-melodic', shuffled, rootMidi, direction),
    rootMidi,
    options: shuffled,
    answer: interval.name,
    hint: INTERVAL_HINTS[interval.name],
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
  const shuffled = shuffle(options, seed);
  return {
    id: `interval-harm-${level}-${seed}`,
    type: 'interval-harmonic',
    audioSequence: [{ midi: rootMidi, durationMs: 1500, simultaneous: true }, { midi: targetMidi, durationMs: 1500, simultaneous: true }],
    optionAudios: buildOptionAudios('interval-harmonic', shuffled, rootMidi),
    rootMidi,
    options: shuffled,
    answer: interval.name,
    hint: INTERVAL_HINTS[interval.name],
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
  const shuffled = shuffle(options, seed);
  return {
    id: `scale-${level}-${seed}`,
    type: 'scale-identify',
    audioSequence: seq,
    optionAudios: buildOptionAudios('scale-identify', shuffled, rootMidi),
    rootMidi,
    options: shuffled,
    answer: scale.name,
    hint: SCALE_HINTS[scale.name],
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
  const shuffled = shuffle(options, seed);
  return {
    id: `chord-${level}-${seed}`,
    type: 'chord-identify',
    audioSequence: seq,
    optionAudios: buildOptionAudios('chord-identify', shuffled, rootMidi),
    rootMidi,
    options: shuffled,
    answer: chord.name,
    hint: CHORD_HINTS[chord.name],
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
