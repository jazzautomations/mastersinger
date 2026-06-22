// ──────────────────────────────────────────────────────────────────────────
// Guided Journey — a 30-day on-ramp that turns the loose menu into a path.
//
// Instead of dumping the user into a menu of tools, the home screen opens on
// TODAY's day. Each day is a small, specific mission (warmup → a lesson → a
// practice exercise → review). Completing a day advances the path. This gives
// beginners a reason to come back tomorrow, and a clear sense of progress.
//
// Days are generated deterministically so the structure is stable and
// testable, but each maps onto real content (courses / exercises / warmups).
// ──────────────────────────────────────────────────────────────────────────

import type { View } from '../types';
import { COURSES } from './courses';
import { EXERCISES, getExercisesByLevel } from './exercises';
import { WARMUP_ROUTINES } from './warmups';

export type JourneyStepKind = 'warmup' | 'lesson' | 'practice' | 'ear' | 'theory' | 'review';

export interface JourneyStep {
  kind: JourneyStepKind;
  title: string;          // localized via the day's own label map
  view: View;
  viewOpts?: any;         // preselected exercise / course / lesson ids
  xp: number;             // XP granted by completing the step
}

export interface JourneyDay {
  day: number;            // 1..30
  title: string;
  blurb: string;          // one-line motivation
  steps: JourneyStep[];
  totalXp: number;
}

// ── Pool builders (so the journey always references real content) ──
function allLessons() {
  return COURSES.flatMap(c => c.lessons.map(l => ({ course: c, lesson: l })));
}

function begExercise() { return getExercisesByLevel('beginner')[0] ?? EXERCISES[0]; }
function intExercise() { return getExercisesByLevel('intermediate')[0] ?? EXERCISES[5]; }

// Deterministic pick so day N always maps to the same lesson/exercise.
function pick<T>(arr: T[], n: number): T {
  if (arr.length === 0) throw new Error('empty pool');
  return arr[((n % arr.length) + arr.length) % arr.length];
}

const WARMUP_DAYS = [1, 3, 5, 8, 10, 13, 16, 19, 22, 25, 28]; // every other-ish

/**
 * Build the full 30-day journey.
 */
export function buildJourney(): JourneyDay[] {
  const lessons = allLessons();
  const days: JourneyDay[] = [];

  for (let d = 1; d <= 30; d++) {
    const steps: JourneyStep[] = [];

    // 1) Warmup on warmup-days
    if (WARMUP_DAYS.includes(d)) {
      steps.push({
        kind: 'warmup',
        title: 'Aquecimento vocal',
        view: 'warmup',
        viewOpts: { routineId: d <= 10 ? 'quick' : 'complete' },
        xp: 12,
      });
    }

    // 2) Lesson — cycle through courses
    const lessonPair = pick(lessons, d - 1);
    steps.push({
      kind: 'lesson',
      title: lessonPair.lesson.title,
      view: 'academy',
      viewOpts: { courseId: lessonPair.course.id, lessonId: lessonPair.lesson.id },
      xp: lessonPair.lesson.xp,
    });

    // 3) Practice — beginner early, intermediate later
    const ex = d <= 12 ? begExercise() : intExercise();
    steps.push({
      kind: 'practice',
      title: ex.title,
      view: 'practice',
      viewOpts: { exerciseIds: [ex.id], isDaily: true },
      xp: ex.xp,
    });

    // 4) Ear training every 3rd day
    if (d % 3 === 0) {
      steps.push({ kind: 'ear', title: 'Treino de ouvido', view: 'ear', xp: 20 });
    }

    // 5) Theory every 4th day
    if (d % 4 === 0) {
      steps.push({ kind: 'theory', title: 'Teoria musical', view: 'theory', xp: 15 });
    }

    // 6) Review on day 7, 14, 21, 30
    if (d % 7 === 0 || d === 30) {
      steps.push({ kind: 'review', title: 'Revisão', view: 'progress', xp: 10 });
    }

    const totalXp = steps.reduce((s, x) => s + x.xp, 0);
    const titles = [
      'Sua primeira nota', 'Respiração e apoio', 'Colocação frontal', 'O vibrato natural',
      'Extremo grave', 'Extremo agudo', 'Primeira revisão', 'A oitava',
      'A terça maior', 'A quinta justa', 'Escala maior', 'Escala menor',
      'Modos (Dórico)', 'Modos (Frígio)', 'Pentatônica', 'Blues',
      'Arpejos maiores', 'Arpejos menores', 'Acordes com 7', 'Sustentar nota',
      'Saltos grandes', 'Agilidade', 'Messa di voce', 'Belting básico',
      'Mix voice', 'Falsete controlado', 'Estilo e fraseado', 'Performance',
      'Afinação cirúrgica', 'Você chegou! 🎉',
    ];
    const blurbs = [
      'Comece pelo começo: uma nota, no tempo.',
      'O motor de toda voz é a respiração.',
      'Aprenda a mandar o som pra frente.',
      'O que dá vida à nota sustentada.',
      'Ache e fortaleça seu registro grave.',
      'Suba com segurança, sem gritar.',
      'Recapitule tudo que praticou.',
      'A oitava é o intervalo mais poderoso.',
      'A terça que define maior vs menor.',
      'A quinta que sustenta toda harmonia.',
      'A base de toda música tonal.',
      'O lado mais melancólico.',
      'Som folk e jazz, com alma.',
      'Exótico e dramático.',
      'As cinco notas que nunca erram.',
      'A alma do blues e do rock.',
      'Quebre o acorde em melodias.',
      'Arpejos menores, mais tensos.',
      'Acordes com cor jazzística.',
      'Estabilidade é metade do afinado.',
      'Pule intervalos sem deslizar.',
      'Corra pela escala com clareza.',
      'Crescer e decrescer numa nota.',
      'Projeção potente e segura.',
      'Una grave e agudo sem quebrar.',
      'Controle fino do registro leve.',
      'Dê personalidade à melodia.',
      'Cante como se alguém ouvisse.',
      '±2 cents por segundos seguidos.',
      '30 dias. Sua voz já é outra.',
    ];

    days.push({
      day: d,
      title: titles[d - 1] ?? `Dia ${d}`,
      blurb: blurbs[d - 1] ?? 'Mais um passo na sua voz.',
      steps,
      totalXp,
    });
  }

  return days;
}

let CACHED: JourneyDay[] | null = null;
export function getJourney(): JourneyDay[] {
  if (!CACHED) CACHED = buildJourney();
  return CACHED;
}

export function getJourneyDay(day: number): JourneyDay | undefined {
  return getJourney().find(d => d.day === day);
}

/**
 * Determine the current day from stored progress. Day 1 if nothing done yet.
 * A day counts as "completed" when its lessons + practice exercises are done.
 */
export function currentJourneyDay(completedLessons: string[], resultExerciseIds: string[]): number {
  const journey = getJourney();
  let current = 1;
  for (const day of journey) {
    const lessonSteps = day.steps.filter(s => s.kind === 'lesson');
    const practiceSteps = day.steps.filter(s => s.kind === 'practice');
    const lessonDone = lessonSteps.every(s => {
      const id = s.viewOpts?.lessonId;
      return id ? completedLessons.includes(id) : true;
    });
    const practiceDone = practiceSteps.every(s => {
      const id = s.viewOpts?.exerciseIds?.[0];
      return id ? resultExerciseIds.includes(id) : true;
    });
    if (lessonDone && practiceDone) current = day.day + 1;
    else break;
  }
  return Math.min(current, 30);
}

export function isDayComplete(day: JourneyDay, completedLessons: string[], resultExerciseIds: string[]): boolean {
  const lessonSteps = day.steps.filter(s => s.kind === 'lesson');
  const practiceSteps = day.steps.filter(s => s.kind === 'practice');
  const lessonDone = lessonSteps.every(s => {
    const id = s.viewOpts?.lessonId;
    return id ? completedLessons.includes(id) : true;
  });
  const practiceDone = practiceSteps.every(s => {
    const id = s.viewOpts?.exerciseIds?.[0];
    return id ? resultExerciseIds.includes(id) : true;
  });
  return lessonDone && practiceDone;
}
