import type { Exercise } from '../types';
import { SCALES, ARPEGGIO_TYPES, INTERVALS, buildScale, buildArpeggio, NOTE_NAMES_SHARP } from '../services/theoryService';

// ── Helper: build a scale-runner exercise ──
// Tempos are deliberately SLOW so a singer has time to land each note and
// read the live pitch feedback before the next target arrives. Beginners get
// ~1.2s/note; even advanced stays under ~0.9s. Notes are legato (full beat)
// so there's no silent gap that the detector reads as "missed".
function scaleRunner(
  id: string,
  level: Exercise['level'],
  keyPc: number,
  scaleKey: string,
  octave = 4,
  bpm = 60,
): Exercise {
  const rootMidi = (octave + 1) * 12 + keyPc;
  const notes = buildScale(rootMidi, scaleKey, 1);
  const beatMs = 60000 / bpm;
  // 1-beat lead-in so the singer can breathe before note 1.
  const leadIn = beatMs;
  const targets = notes.map((midi, i) => ({
    midi,
    startMs: leadIn + i * beatMs,
    durationMs: beatMs,
  }));
  const scaleName = SCALES[scaleKey].name;
  const keyName = NOTE_NAMES_SHARP[keyPc];
  return {
    id,
    type: 'scale-runner',
    title: `${keyName} ${scaleName}`,
    description: `Cante a ${scaleName.toLowerCase()} em ${keyName} — subindo e descendo.`,
    level,
    key: keyName,
    scaleName,
    targets: [...targets, ...[...targets].reverse().slice(1, -1).map((t, i) => ({
      ...t,
      startMs: leadIn + (targets.length + i) * beatMs,
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
  bpm = 55,
): Exercise {
  const rootMidi = (octave + 1) * 12 + keyPc;
  const notes = buildArpeggio(rootMidi, arpType);
  const beatMs = 60000 / bpm;
  const leadIn = beatMs;
  const up = notes.map((midi, i) => ({ midi, startMs: leadIn + i * beatMs, durationMs: beatMs }));
  const down = [...up].reverse().slice(1, -1).map((t, i) => ({
    ...t,
    startMs: leadIn + (notes.length + i) * beatMs,
  }));
  const keyName = NOTE_NAMES_SHARP[keyPc];
  return {
    id,
    type: 'arpeggio-drill',
    title: `${keyName} ${ARPEGGIO_TYPES[arpType].name}`,
    description: `Arpeje o ${ARPEGGIO_TYPES[arpType].name.toLowerCase()} em ${keyName}.`,
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
  const beatMs = 1100; // ~1.1s per beat — long enough to land + read feedback
  const leadIn = beatMs;
  const targets = [
    { midi: startMidi, startMs: leadIn,            durationMs: beatMs },       // ref 1
    { midi: startMidi, startMs: leadIn + beatMs,   durationMs: beatMs },       // ref 2 (repeat)
    { midi: targetMidi, startMs: leadIn + beatMs*2, durationMs: beatMs * 2 },  // leap (held)
    { midi: startMidi, startMs: leadIn + beatMs*4, durationMs: beatMs },       // resolve
  ];
  return {
    id,
    type: 'interval-leap',
    title: interval.name,
    description: `Ouça, cante a primeira nota, depois salte uma ${interval.name.toLowerCase()}.`,
    level,
    targets,
    tempoBpm: 55,
    xp: level === 'beginner' ? 20 : level === 'intermediate' ? 30 : 45,
  };
}

function pitchHold(id: string, level: Exercise['level'], midi: number, seconds: number): Exercise {
  return {
    id,
    type: 'pitch-hold',
    title: `Sustentar ${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][midi % 12]}${Math.floor(midi / 12) - 1}`,
    description: `Sustente a nota alvo dentro de ±10 cents por ${seconds} segundos.`,
    level,
    targets: [{ midi, startMs: 1200, durationMs: seconds * 1000 }],
    tempoBpm: undefined,
    xp: level === 'beginner' ? 15 : level === 'intermediate' ? 25 : 40,
  };
}

// ── Library ──
export const EXERCISES: Exercise[] = [
  // Beginner — slow tempos (60 / 55 BPM)
  scaleRunner('sc-beg-cmajor', 'beginner', 0, 'major', 4, 60),
  scaleRunner('sc-beg-cminor', 'beginner', 0, 'minorNatural', 4, 60),
  scaleRunner('sc-beg-gmajor', 'beginner', 7, 'major', 4, 60),
  arpeggioDrill('ar-beg-cmajor', 'beginner', 0, 'major', 4, 50),
  arpeggioDrill('ar-beg-cminor', 'beginner', 0, 'minor', 4, 50),
  intervalLeap('iv-beg-p5', 'beginner', 'p5', 60),
  intervalLeap('iv-beg-maj3', 'beginner', 'maj3', 60),
  intervalLeap('iv-beg-oct', 'beginner', 'octave', 60),
  pitchHold('ph-beg-a3', 'beginner', 57, 5),
  pitchHold('ph-beg-c4', 'beginner', 60, 5),
  pitchHold('ph-beg-e4', 'beginner', 64, 5),

  // Intermediate — moderate (70 / 65 BPM)
  scaleRunner('sc-int-dminor-harm', 'intermediate', 2, 'minorHarmonic', 4, 70),
  scaleRunner('sc-int-emajor', 'intermediate', 4, 'major', 4, 70),
  scaleRunner('sc-int-aminor-mel', 'intermediate', 9, 'minorMelodic', 4, 70),
  scaleRunner('sc-int-c-pentatonic', 'intermediate', 0, 'majorPentatonic', 4, 75),
  scaleRunner('sc-int-d-dorian', 'intermediate', 2, 'dorian', 4, 70),
  scaleRunner('sc-int-e-phrygian', 'intermediate', 4, 'phrygian', 4, 65),
  arpeggioDrill('ar-int-dminor7', 'intermediate', 2, 'minor7', 4, 65),
  arpeggioDrill('ar-int-gdom7', 'intermediate', 7, 'dominant7', 4, 65),
  arpeggioDrill('ar-int-cmajor7', 'intermediate', 0, 'major7', 4, 65),
  intervalLeap('iv-int-min3', 'intermediate', 'min3', 60),
  intervalLeap('iv-int-tritone', 'intermediate', 'tritone', 60),
  intervalLeap('iv-int-maj6', 'intermediate', 'maj6', 60),
  intervalLeap('iv-int-maj7', 'intermediate', 'maj7', 60),
  intervalLeap('iv-int-maj9', 'intermediate', 'maj9', 60),
  pitchHold('ph-int-g3', 'intermediate', 55, 8),
  pitchHold('ph-int-a4', 'intermediate', 69, 8),
  pitchHold('ph-int-c5', 'intermediate', 72, 10),

  // Advanced — brisk (80 / 75 BPM)
  scaleRunner('sc-adv-f-lydian', 'advanced', 5, 'lydian', 4, 80),
  scaleRunner('sc-adv-b-locrian', 'advanced', 11, 'locrian', 4, 75),
  scaleRunner('sc-adv-c-whole-tone', 'advanced', 0, 'wholeTone', 4, 75),
  scaleRunner('sc-adv-c-chromatic', 'advanced', 0, 'chromatic', 4, 75),
  scaleRunner('sc-adv-a-blues', 'advanced', 9, 'blues', 4, 75),
  arpeggioDrill('ar-adv-bdim7', 'advanced', 11, 'diminished7', 4, 70),
  arpeggioDrill('ar-adv-f#m7b5', 'advanced', 6, 'minor7b5', 4, 70),
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
