import type { Exercise } from '../types';
import { SCALES, ARPEGGIO_TYPES, INTERVALS, buildScale, buildArpeggio } from '../services/theoryService';

// ── Helper: build a scale-runner exercise ──
function scaleRunner(
  id: string,
  level: Exercise['level'],
  keyPc: number,         // pitch class 0..11 (C=0)
  scaleKey: string,
  octave = 4,
  bpm = 90,
): Exercise {
  const rootMidi = (octave + 1) * 12 + keyPc;
  const notes = buildScale(rootMidi, scaleKey, 1);
  const beatMs = 60000 / bpm;
  const targets = notes.map((midi, i) => ({
    midi,
    startMs: i * beatMs,
    durationMs: beatMs * 0.9,
  }));
  const scaleName = SCALES[scaleKey].name;
  const keyName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][keyPc];
  return {
    id,
    type: 'scale-runner',
    title: `${keyName} ${scaleName}`,
    description: `Sing the ${scaleName.toLowerCase()} in ${keyName} — up and back down.`,
    level,
    key: keyName,
    scaleName,
    targets: [...targets, ...[...targets].reverse().slice(1, -1).map((t, i) => ({
      ...t,
      startMs: (targets.length + i) * beatMs,
    }))],
    tempoBpm: bpm,
    xp: level === 'beginner' ? 20 : level === 'intermediate' ? 35 : 50,
  };
}

function arpeggioDrill(
  id: string,
  level: Exercise['level'],
  keyPc: number,
  arpType: string,
  octave = 4,
  bpm = 80,
): Exercise {
  const rootMidi = (octave + 1) * 12 + keyPc;
  const notes = buildArpeggio(rootMidi, arpType);
  const beatMs = 60000 / bpm;
  const up = notes.map((midi, i) => ({ midi, startMs: i * beatMs, durationMs: beatMs * 0.9 }));
  const down = [...notes].reverse().slice(1, -1).map((t, i) => ({
    ...t,
    startMs: (notes.length + i) * beatMs,
  }));
  const keyName = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][keyPc];
  return {
    id,
    type: 'arpeggio-drill',
    title: `${keyName} ${ARPEGGIO_TYPES[arpType].name}`,
    description: `Arpeggiate the ${ARPEGGIO_TYPES[arpType].name.toLowerCase()} in ${keyName}.`,
    level,
    key: keyName,
    scaleName: ARPEGGIO_TYPES[arpType].name,
    targets: [...up, ...down],
    tempoBpm: bpm,
    xp: level === 'beginner' ? 25 : level === 'intermediate' ? 40 : 55,
  };
}

function intervalLeap(
  id: string,
  level: Exercise['level'],
  intervalKey: string,
  startMidi = 60,
): Exercise {
  const interval = INTERVALS[intervalKey];
  const targetMidi = startMidi + interval.semitones;
  const beatMs = 700;
  const targets = [
    { midi: startMidi, startMs: 0,         durationMs: beatMs * 0.9 },
    { midi: startMidi, startMs: beatMs,    durationMs: beatMs * 0.9 },
    { midi: targetMidi, startMs: beatMs*2, durationMs: beatMs * 1.8 },
    { midi: startMidi, startMs: beatMs*4, durationMs: beatMs * 0.9 },
  ];
  return {
    id,
    type: 'interval-leap',
    title: interval.name,
    description: `Listen, sing the first note, then leap up a ${interval.name.toLowerCase()}.`,
    level,
    targets,
    tempoBpm: 86,
    xp: level === 'beginner' ? 20 : level === 'intermediate' ? 30 : 45,
  };
}

function pitchHold(id: string, level: Exercise['level'], midi: number, seconds: number): Exercise {
  return {
    id,
    type: 'pitch-hold',
    title: `Hold ${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][midi % 12]}${Math.floor(midi / 12) - 1}`,
    description: `Sustain the target note within ±10 cents for ${seconds} seconds.`,
    level,
    targets: [{ midi, startMs: 0, durationMs: seconds * 1000 }],
    tempoBpm: undefined,
    xp: level === 'beginner' ? 15 : level === 'intermediate' ? 25 : 40,
  };
}

// ── Library ──
export const EXERCISES: Exercise[] = [
  // Beginner
  scaleRunner('sc-beg-cmajor', 'beginner', 0, 'major', 4, 80),
  scaleRunner('sc-beg-cminor', 'beginner', 0, 'minorNatural', 4, 80),
  scaleRunner('sc-beg-gmajor', 'beginner', 7, 'major', 4, 80),
  arpeggioDrill('ar-beg-cmajor', 'beginner', 0, 'major', 4, 70),
  arpeggioDrill('ar-beg-cminor', 'beginner', 0, 'minor', 4, 70),
  intervalLeap('iv-beg-p5', 'beginner', 'p5', 60),
  intervalLeap('iv-beg-maj3', 'beginner', 'maj3', 60),
  intervalLeap('iv-beg-oct', 'beginner', 'octave', 60),
  pitchHold('ph-beg-a3', 'beginner', 57, 5),
  pitchHold('ph-beg-c4', 'beginner', 60, 5),
  pitchHold('ph-beg-e4', 'beginner', 64, 5),

  // Intermediate
  scaleRunner('sc-int-dminor-harm', 'intermediate', 2, 'minorHarmonic', 4, 100),
  scaleRunner('sc-int-emajor', 'intermediate', 4, 'major', 4, 100),
  scaleRunner('sc-int-aminor-mel', 'intermediate', 9, 'minorMelodic', 4, 100),
  scaleRunner('sc-int-c-pentatonic', 'intermediate', 0, 'majorPentatonic', 4, 110),
  scaleRunner('sc-int-d-dorian', 'intermediate', 2, 'dorian', 4, 100),
  scaleRunner('sc-int-e-phrygian', 'intermediate', 4, 'phrygian', 4, 90),
  arpeggioDrill('ar-int-dminor7', 'intermediate', 2, 'minor7', 4, 90),
  arpeggioDrill('ar-int-gdom7', 'intermediate', 7, 'dominant7', 4, 90),
  arpeggioDrill('ar-int-cmajor7', 'intermediate', 0, 'major7', 4, 90),
  intervalLeap('iv-int-min3', 'intermediate', 'min3', 60),
  intervalLeap('iv-int-tritone', 'intermediate', 'tritone', 60),
  intervalLeap('iv-int-maj6', 'intermediate', 'maj6', 60),
  intervalLeap('iv-int-maj7', 'intermediate', 'maj7', 60),
  intervalLeap('iv-int-maj9', 'intermediate', 'maj9', 60),
  pitchHold('ph-int-g3', 'intermediate', 55, 8),
  pitchHold('ph-int-a4', 'intermediate', 69, 8),
  pitchHold('ph-int-c5', 'intermediate', 72, 10),

  // Advanced
  scaleRunner('sc-adv-f-lydian', 'advanced', 5, 'lydian', 4, 120),
  scaleRunner('sc-adv-b-locrian', 'advanced', 11, 'locrian', 4, 110),
  scaleRunner('sc-adv-c-whole-tone', 'advanced', 0, 'wholeTone', 4, 110),
  scaleRunner('sc-adv-c-chromatic', 'advanced', 0, 'chromatic', 4, 110),
  scaleRunner('sc-adv-a-blues', 'advanced', 9, 'blues', 4, 110),
  arpeggioDrill('ar-adv-bdim7', 'advanced', 11, 'diminished7', 4, 100),
  arpeggioDrill('ar-adv-f#m7b5', 'advanced', 6, 'minor7b5', 4, 100),
  intervalLeap('iv-adv-min9', 'advanced', 'min9', 60),
  intervalLeap('iv-adv-min6', 'advanced', 'min6', 60),
  pitchHold('ph-adv-e5', 'advanced', 76, 12),
  pitchHold('ph-adv-g2', 'advanced', 43, 12),
];

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find(e => e.id === id);
}

export function getExercisesByType(type: Exercise['type']): Exercise[] {
  return EXERCISES.filter(e => e.type === type);
}

export function getExercisesByLevel(level: Exercise['level']): Exercise[] {
  return EXERCISES.filter(e => e.level === level);
}

// ── Daily challenge generator — deterministic by date ──
export function dailyChallengeExercises(date = new Date()): Exercise[] {
  const day = Math.floor(date.getTime() / 86400000);
  const pool = [
    ...getExercisesByType('scale-runner').filter(e => e.level === 'intermediate'),
    ...getExercisesByType('arpeggio-drill').filter(e => e.level === 'intermediate'),
    ...getExercisesByType('interval-leap').filter(e => e.level === 'intermediate'),
    ...getExercisesByType('pitch-hold').filter(e => e.level === 'intermediate'),
  ];
  const seed = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  const idx1 = Math.floor(seed(day) * pool.filter(e => e.type === 'scale-runner').length);
  const idx2 = Math.floor(seed(day + 1) * pool.filter(e => e.type === 'interval-leap').length);
  const idx3 = Math.floor(seed(day + 2) * pool.filter(e => e.type === 'pitch-hold').length);
  return [
    pool.filter(e => e.type === 'scale-runner')[idx1],
    pool.filter(e => e.type === 'interval-leap')[idx2],
    pool.filter(e => e.type === 'pitch-hold')[idx3],
  ].filter(Boolean);
}
