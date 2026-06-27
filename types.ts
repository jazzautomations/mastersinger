// ──────────────────────────────────────────────────────────────────────────
// MasterSinger — Core domain types
// ──────────────────────────────────────────────────────────────────────────

export type StudentLevel = 'beginner' | 'intermediate' | 'advanced';

// ── Voice classification (derived from detected range) ──
export type VoiceType = 'soprano' | 'mezzo' | 'alto' | 'tenor' | 'baritone' | 'bass' | 'unknown';

export type View =
  | 'home'
  | 'tuner'
  | 'practice'
  | 'performance' // karaoke-style note highway game
  | 'studio'      // MIDI melody editor
  | 'ear'
  | 'theory'
  | 'harmony'
  | 'rhythm'      // rhythm trainer (metronome + tap-on-beat)
  | 'academy'
  | 'progress'
  | 'settings'
  | 'warmup'      // guided interactive vocal warmup
  | 'recorder'   // video recording with tuner overlay
  | 'teacher';    // teacher dashboard

export type Language = 'pt-BR' | 'en';

// ── Pitch detection ──
export interface PitchFrame {
  frequency: number;   // Hz, 0 if silent/unreliable
  confidence: number;  // 0..1
  cents: number;       // -50..+50 from nearest note
  midi: number;        // 0..127 (float, not rounded)
  noteName: string;    // e.g. "A4"
  octave: number;
  timestamp: number;   // ms since detection start
}

// ── Melody / MIDI ──
export interface Note {
  startTime: number;   // ms
  endTime: number;     // ms
  frequency: number;   // Hz average
  midi: number;        // 0..127 integer
  cents: number;       // -50..+50 average deviation during note
  velocity: number;    // 0..127
  confidence: number;  // 0..1
  lyric?: string;
}

// ── Saved melody (in-app library, persisted to localStorage) ──
export interface SavedMelody {
  id: string;
  name: string;
  notes: Note[];
  durationMs: number;
  noteCount: number;
  createdAt: number;
}

// ── Practice ──
export type ExerciseType =
  | 'scale-runner'
  | 'arpeggio-drill'
  | 'interval-leap'
  | 'pitch-hold';

export interface ExerciseTarget {
  midi: number;          // target note
  startMs: number;       // when it should sound (relative to exercise start)
  durationMs: number;    // how long it should last
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  title: string;
  description: string;   // English
  descriptionPt?: string; // Portuguese (pt-BR)
  level: StudentLevel;
  key?: string;          // e.g. "C", "G"
  scaleName?: string;    // e.g. "Major", "Minor Harmonic"
  direction?: 'ascending' | 'descending' | 'both';  // scale/arpeggio travel direction (default 'both')
  targets: ExerciseTarget[];
  tempoBpm?: number;
  xp: number;
}

export interface ExerciseResult {
  exerciseId: string;
  score: number;          // 0..100
  accuracyPct: number;    // 0..100 — pitch accuracy
  timingPct: number;      // 0..100 — timing accuracy
  stabilityPct: number;   // 0..100 — pitch stability within notes
  xpEarned: number;
  completedAt: number;    // timestamp
}

// ── Ear training ──
export type EarQuestionType =
  | 'interval-melodic'
  | 'interval-harmonic'
  | 'scale-identify'
  | 'chord-identify'
  | 'cadence-identify';

export interface EarQuestion {
  id: string;
  type: EarQuestionType;
  audioSequence: { midi: number; durationMs: number; simultaneous?: boolean }[];
  // Per-option reference audio so a learner who answered wrong can listen to
  // every alternative and assimilate the difference before moving on.
  optionAudios?: Record<string, { midi: number; durationMs: number; simultaneous?: boolean }[]>;
  rootMidi?: number;       // root the question was built on (for transposition)
  options: string[];
  answer: string;
  hint?: string;           // pedagogical explanation shown after answering
  level: StudentLevel;
  xp: number;
}

// ── Academy ──
export interface Lesson {
  id: string;
  courseId: string;
  index: number;
  title: string;
  summary: string;
  content: LessonBlock[];
  exerciseId?: string;     // optional practice exercise tied to the lesson
  xp: number;
}

export type LessonBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'tip'; text: string }
  | { kind: 'audio'; midi: number; durationMs: number; label: string }
  | { kind: 'list'; items: string[] };

export interface Course {
  id: string;
  title: string;
  description: string;
  level: StudentLevel;
  color: string;          // accent
  icon: string;           // emoji
  lessons: Lesson[];
}

// ── Lesson comprehension quiz (bilingual, self-contained) ──
// Stored in data/lessonQuizzes.ts keyed by lesson id, so it never disturbs the
// index-based pt translation map in courses.pt.ts.
export interface LessonQuiz {
  question: string;
  questionPt: string;
  options: string[];
  optionsPt: string[];
  answer: number;          // index into options/optionsPt
  explanation: string;
  explanationPt: string;
}

// ── Gamification ──
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: number;
}

export interface LevelInfo {
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPct: number;
}

export type League = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

// ── User profile (persisted) ──
export interface UserProfile {
  level: number;          // 1..100
  xp: number;
  badges: string[];       // earned badge ids
  streak: {
    current: number;
    longest: number;
    lastActiveDate: string;  // YYYY-MM-DD
    freezes: number;
  };
  weeklyXp: { weekStart: string; xp: number }[];
  range: {
    lowestMidi?: number;
    highestMidi?: number;
    detectedAt?: number;
    voiceType?: VoiceType;   // classified from lowest/highest
  };
  settings: {
    language: Language;
    a4: number;            // tuning reference, default 440
    level: StudentLevel;
    rangeCenterMidi?: number;  // midpoint of detected range; exercises transpose to sit here
    audioInputDeviceId?: string;
    // ── Audio tuning settings ──
    micSensitivity?: number;   // 0.0..1.0, default 0.5 — higher = more sensitive
    noiseGate?: number;        // 0.0..0.1, default 0.02 — RMS below this is treated as silence
    tuningPrecision?: 'fast' | 'balanced' | 'precise'; // latency vs accuracy tradeoff
    onboarding?: {
      singsAlready?: boolean;
      singingTime?: string;
      favoriteStyles?: string[];
      hadLessons?: boolean;
      lessonsTime?: string;
    };
  };
  results: ExerciseResult[];   // recent N results
  completedLessons: string[];
  dailyChallenge?: {
    date: string;
    exerciseIds: string[];
    completed: boolean;
  };
}

// ── Guided warmup ──
export type WarmupStepKind = 'info' | 'breath' | 'glide' | 'scale' | 'sustain' | 'siren';

export interface WarmupGuide {
  type: 'tone' | 'sequence' | 'glide';
  midi?: number;                       // sustained reference (tone)
  midis?: number[];                    // ascending/descending pattern (sequence)
  beatMs?: number;                     // per-note duration for sequence
  fromMidi?: number; toMidi?: number;  // glide endpoints
}

export interface WarmupTarget {
  midi: number;
  startMs: number;
  durationMs: number;
}

export interface WarmupStep {
  id: string;
  kind: WarmupStepKind;
  title: string;
  instructions: string;
  durationMs: number;        // total step length
  guide?: WarmupGuide;       // reference audio the user sings along with
  targets?: WarmupTarget[];  // pitch curve to track against (for feedback)
  tracksPitch?: boolean;     // show live pitch overlay
  tip?: string;
}

export interface WarmupRoutine {
  id: string;
  title: string;
  description: string;
  totalMinutes: number;
  steps: WarmupStep[];
}
