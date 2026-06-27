// ─────────────────────────────────────────────────────────────────────────
// Playable audio examples per lesson — the missing "hear it" layer for a
// singing app. Keyed by lesson id (like quizzes) so the index-based pt map in
// courses.pt.ts is never touched. Rendered by the Academy as a "🔊 Listen"
// section; played through audioService (playNote / playSequence / playChord).
// MIDI: 60 = middle C (C4).
// ─────────────────────────────────────────────────────────────────────────

export type AudioMode = 'note' | 'sequence' | 'chord';

export interface LessonAudio {
  label: string;
  labelPt: string;
  midis: number[];
  mode: AudioMode;
  noteMs?: number;   // per-note (sequence) or total (note/chord) duration
}

export const LESSON_AUDIO: Record<string, LessonAudio[]> = {
  // 🔥 warmup
  'warmup-1': [{ label: 'Comfortable note (middle C)', labelPt: 'Nota confortável (Dó central)', midis: [60], mode: 'note', noteMs: 1600 }],
  'warmup-2': [{ label: 'Lip trill glide (5-4-3-2-1)', labelPt: 'Lip trill descendo (5-4-3-2-1)', midis: [67, 65, 64, 62, 60], mode: 'sequence', noteMs: 320 }],
  'warmup-3': [{ label: 'Hum along', labelPt: 'Cantarole junto (hum)', midis: [62], mode: 'note', noteMs: 2200 }],
  'warmup-4': [{ label: 'Sustain on one breath', labelPt: 'Sustente numa só respiração', midis: [60], mode: 'note', noteMs: 4500 }],
  'warmup-5': [{ label: 'Map your range (C major)', labelPt: 'Mapeie sua extensão (Dó maior)', midis: [60, 62, 64, 65, 67, 69, 71, 72], mode: 'sequence', noteMs: 300 }],
  'warmup-6': [{ label: 'Clean onset', labelPt: 'Onset (ataque) limpo', midis: [60], mode: 'note', noteMs: 1300 }],
  'warmup-7': [{ label: 'Tune your vowels (A-E-I-O-U)', labelPt: 'Afine as vogais (A-E-I-O-U)', midis: [62], mode: 'note', noteMs: 2400 }],
  'warmup-8': [{ label: 'Warm-up pattern', labelPt: 'Padrão de aquecimento', midis: [60, 62, 64, 65, 67, 65, 64, 62, 60], mode: 'sequence', noteMs: 260 }],

  // 🎯 pitch-accuracy
  'pitch-1': [{ label: 'Reference pitch', labelPt: 'Nota de referência', midis: [60], mode: 'note', noteMs: 1800 }],
  'pitch-2': [{ label: 'Drone (A3) — tune to it', labelPt: 'Drone (Lá2) — afine por ele', midis: [57], mode: 'note', noteMs: 5000 }],
  'pitch-3': [{ label: 'Pitch hold (E4)', labelPt: 'Sustentação (Mi4)', midis: [64], mode: 'note', noteMs: 4500 }],
  'pitch-4': [{ label: 'Perfect fifth (C–G)', labelPt: 'Quinta justa (Dó–Sol)', midis: [60, 67], mode: 'sequence', noteMs: 650 }],
  'pitch-5': [{ label: 'Match this pitch', labelPt: 'Iguale esta nota', midis: [60], mode: 'note', noteMs: 1800 }],

  // 📏 intervals
  'int-1': [{ label: 'Major third (C–E)', labelPt: 'Terça maior (Dó–Mi)', midis: [60, 64], mode: 'sequence', noteMs: 650 }],
  'int-2': [
    { label: 'Consonant: perfect fifth', labelPt: 'Consonante: quinta justa', midis: [60, 67], mode: 'chord', noteMs: 1600 },
    { label: 'Dissonant: tritone', labelPt: 'Dissonante: trítono', midis: [60, 66], mode: 'chord', noteMs: 1600 },
  ],
  'int-3': [{ label: 'Perfect fifth (Twinkle / Parabéns)', labelPt: 'Quinta justa (Parabéns pra você)', midis: [60, 67], mode: 'sequence', noteMs: 650 }],
  'int-4': [{ label: 'Octave (C–C)', labelPt: 'Oitava (Dó–Dó)', midis: [60, 72], mode: 'sequence', noteMs: 650 }],

  // 🪜 scales
  'scl-1': [{ label: 'C major scale', labelPt: 'Escala de Dó maior', midis: [60, 62, 64, 65, 67, 69, 71, 72], mode: 'sequence', noteMs: 320 }],
  'scl-2': [
    { label: 'Natural minor', labelPt: 'Menor natural', midis: [60, 62, 63, 65, 67, 68, 70, 72], mode: 'sequence', noteMs: 320 },
    { label: 'Harmonic minor (raised 7th)', labelPt: 'Menor harmônica (7º elevado)', midis: [60, 62, 63, 65, 67, 68, 71, 72], mode: 'sequence', noteMs: 320 },
  ],
  'scl-3': [{ label: 'D Dorian mode', labelPt: 'Modo dórico (em Ré)', midis: [62, 64, 65, 67, 69, 71, 72, 74], mode: 'sequence', noteMs: 320 }],
  'scl-4': [{ label: 'C major pentatonic', labelPt: 'Pentatônica maior de Dó', midis: [60, 62, 64, 67, 69, 72], mode: 'sequence', noteMs: 340 }],

  // 🎼 harmony
  'harm-1': [{ label: 'C major triad', labelPt: 'Tríade de Dó maior', midis: [60, 64, 67], mode: 'chord', noteMs: 1800 }],
  'harm-2': [{ label: 'Cmaj7 (diatonic)', labelPt: 'Cmaj7 (diatônico)', midis: [60, 64, 67, 71], mode: 'chord', noteMs: 1800 }],
  'harm-3': [
    { label: 'ii — Dm7', labelPt: 'ii — Dm7', midis: [62, 65, 69, 72], mode: 'chord', noteMs: 1400 },
    { label: 'V — G7', labelPt: 'V — G7', midis: [67, 71, 74, 77], mode: 'chord', noteMs: 1400 },
    { label: 'I — Cmaj7', labelPt: 'I — Cmaj7', midis: [60, 64, 67, 71], mode: 'chord', noteMs: 1800 },
  ],
  'harm-4': [
    { label: 'Melody', labelPt: 'Melodia', midis: [60, 62, 64], mode: 'sequence', noteMs: 420 },
    { label: 'Harmony a third above', labelPt: 'Harmonia uma terça acima', midis: [64, 65, 67], mode: 'sequence', noteMs: 420 },
  ],

  // 🫁 vocal-anatomy
  'anat-1': [{ label: 'Feel the tone resonate', labelPt: 'Sinta o som ressoar', midis: [60], mode: 'note', noteMs: 1800 }],
  'anat-2': [{ label: 'Long breath sustain', labelPt: 'Sustentação longa (apoio)', midis: [60], mode: 'note', noteMs: 4500 }],
  'anat-3': [{ label: 'Low note — feel the larynx', labelPt: 'Nota grave — sinta a laringe', midis: [55], mode: 'note', noteMs: 2200 }],
  'anat-4': [{ label: 'Bright vowel resonance', labelPt: 'Ressonância de vogal brilhante', midis: [64], mode: 'note', noteMs: 2200 }],
  'anat-5': [{ label: 'Watch yourself ascend', labelPt: 'Observe-se subindo', midis: [60, 62, 64, 65, 67], mode: 'sequence', noteMs: 340 }],

  // 💧 vocal-health
  'health-1': [{ label: 'Gentle, hydrated tone', labelPt: 'Som suave e hidratado', midis: [57], mode: 'note', noteMs: 2200 }],
  'health-2': [{ label: 'Cool-down siren', labelPt: 'Sirene de desaquecimento', midis: [67, 65, 63, 62, 60], mode: 'sequence', noteMs: 360 }],
  'health-3': [{ label: 'Easy reference', labelPt: 'Referência tranquila', midis: [60], mode: 'note', noteMs: 1600 }],
  'health-4': [{ label: 'Comfortable tone', labelPt: 'Som confortável', midis: [60], mode: 'note', noteMs: 1600 }],

  // 🎤 singing-technique
  'tech-1': [{ label: 'Grounded tone (good posture)', labelPt: 'Som firme (boa postura)', midis: [55], mode: 'note', noteMs: 2200 }],
  'tech-2': [{ label: 'Appoggio — steady airflow', labelPt: 'Apoio — fluxo de ar estável', midis: [60], mode: 'note', noteMs: 5000 }],
  'tech-3': [{ label: 'Mask resonance (bright)', labelPt: 'Ressonância na máscara (brilho)', midis: [64], mode: 'note', noteMs: 2200 }],
  'tech-4': [{ label: 'Through the registers', labelPt: 'Atravessando os registros', midis: [60, 64, 67, 72], mode: 'sequence', noteMs: 500 }],
  'tech-5': [{ label: 'Clean onset & release', labelPt: 'Onset e release limpos', midis: [62], mode: 'note', noteMs: 1600 }],
  'tech-6': [{ label: 'Add vibrato on a steady note', labelPt: 'Acrescente vibrato numa nota fixa', midis: [64], mode: 'note', noteMs: 4500 }],
  'tech-7': [{ label: 'Pentatonic phrase', labelPt: 'Frase pentatônica', midis: [60, 62, 64, 67, 69], mode: 'sequence', noteMs: 400 }],
};

export function audioForLesson(lessonId: string): LessonAudio[] {
  return LESSON_AUDIO[lessonId] ?? [];
}
