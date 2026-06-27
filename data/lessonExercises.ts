// ─────────────────────────────────────────────────────────────────────────
// Lesson → Practice exercise mapping.
// Every Academy lesson points to the single most relevant Practice exercise,
// so a learner can jump straight from theory into "do it now". Kept separate
// from courses.ts (the bilingual content source) so routing stays readable and
// the fragile index-based pt translation map is never touched.
// Exercise ids are validated against EXERCISES in tests/lessonExercises.test.ts.
// ─────────────────────────────────────────────────────────────────────────

export const LESSON_EXERCISE: Record<string, string> = {
  // 🔥 warmup (beginner)
  'warmup-1': 'ph-beg-c4',
  'warmup-2': 'ph-beg-a3',
  'warmup-3': 'ph-beg-e4',
  'warmup-4': 'ph-beg-c4',
  'warmup-5': 'sc-beg-cmajor',
  'warmup-6': 'ph-beg-c4',
  'warmup-7': 'ph-beg-e4',
  'warmup-8': 'sc-beg-cmajor',

  // 🎯 pitch-accuracy (beginner)
  'pitch-1': 'ph-beg-c4',
  'pitch-2': 'ph-beg-a3',
  'pitch-3': 'ph-beg-e4',
  'pitch-4': 'iv-beg-p5',
  'pitch-5': 'ph-beg-c4',

  // 📏 intervals (intermediate)
  'int-1': 'iv-beg-maj3',
  'int-2': 'iv-int-tritone',
  'int-3': 'iv-beg-p5',
  'int-4': 'iv-beg-oct',

  // 🪜 scales (intermediate)
  'scl-1': 'sc-beg-cmajor',
  'scl-2': 'sc-int-dminor-harm',
  'scl-3': 'sc-int-d-dorian',
  'scl-4': 'sc-int-c-pentatonic',

  // 🎼 harmony (advanced)
  'harm-1': 'ar-beg-cmajor',
  'harm-2': 'ar-int-cmajor7',
  'harm-3': 'ar-int-gdom7',
  'harm-4': 'iv-beg-maj3',

  // 🫁 vocal-anatomy (beginner)
  'anat-1': 'ph-beg-c4',
  'anat-2': 'ph-beg-a3',
  'anat-3': 'ph-beg-e4',
  'anat-4': 'ph-beg-e4',
  'anat-5': 'sc-beg-cmajor',

  // 💧 vocal-health (beginner)
  'health-1': 'ph-beg-a3',
  'health-2': 'ph-beg-c4',
  'health-3': 'ph-beg-a3',
  'health-4': 'ph-beg-c4',

  // 🎤 singing-technique (intermediate)
  'tech-1': 'ph-int-g3',
  'tech-2': 'ph-int-c5',
  'tech-3': 'ph-int-a4',
  'tech-4': 'sc-int-emajor',
  'tech-5': 'ph-int-a4',
  'tech-6': 'ph-int-c5',
  'tech-7': 'sc-int-c-pentatonic',
};

export function exerciseForLesson(lessonId: string, fallback?: string): string | undefined {
  return LESSON_EXERCISE[lessonId] ?? fallback;
}
