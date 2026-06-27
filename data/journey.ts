// ──────────────────────────────────────────────────────────────────────────
// Guided Journey — 90-day structured path across 3 phases.
//
// Phase 1 (1–30):   Iniciante   — fundamentos, registro, primeiros intervalos
// Phase 2 (31–60):  Intermediário — técnica avançada, expressão, harmonia
// Phase 3 (61–90):  Avançado    — performance, estilos, identidade vocal
//
// After day 90 the app enters "Modo Livre" — the tools (tuner, practice,
// ear training, MIDI studio) remain forever; the journey card shows a weekly
// practice recommendation instead of daily steps.
// ──────────────────────────────────────────────────────────────────────────

import type { View } from '../types';
import { COURSES } from './courses';
import { EXERCISES, getExercisesByLevel } from './exercises';

export type JourneyStepKind = 'warmup' | 'lesson' | 'practice' | 'ear' | 'theory' | 'review';

export interface JourneyStep {
  kind: JourneyStepKind;
  title: string;
  view: View;
  viewOpts?: any;
  xp: number;
}

export interface JourneyDay {
  day: number;         // 1..90
  phase: 1 | 2 | 3;
  title: string;
  blurb: string;
  steps: JourneyStep[];
  totalXp: number;
}

export function getPhase(day: number): 1 | 2 | 3 {
  if (day <= 30) return 1;
  if (day <= 60) return 2;
  return 3;
}

// ── Pool builders ──
function allLessons() {
  return COURSES.flatMap(c => c.lessons.map(l => ({ course: c, lesson: l })));
}

function pickExercise(level: 'beginner' | 'intermediate' | 'advanced', n: number) {
  const pool = getExercisesByLevel(level);
  return pool[n % pool.length] ?? EXERCISES[0];
}

function pick<T>(arr: T[], n: number): T {
  if (arr.length === 0) throw new Error('empty pool');
  return arr[((n % arr.length) + arr.length) % arr.length];
}

// ── Content tables ──
const TITLES: string[] = [
  // Phase 1 — Iniciante (1-30)
  'Sua primeira nota',   'Respiração e apoio',  'Colocação frontal',   'O vibrato natural',
  'Extremo grave',       'Extremo agudo',        'Primeira revisão',    'A oitava',
  'A terça maior',       'A quinta justa',       'Escala maior',        'Escala menor',
  'Modos (Dórico)',      'Modos (Frígio)',        'Pentatônica',         'Blues',
  'Arpejos maiores',     'Arpejos menores',      'Acordes com 7',       'Sustentar nota',
  'Saltos grandes',      'Agilidade',            'Messa di voce',       'Belting básico',
  'Mix voice',           'Falsete controlado',   'Estilo e fraseado',   'Performance',
  'Afinação cirúrgica',  'Fase 1 concluída 🎉',
  // Phase 2 — Intermediário (31-60)
  'Passaggio',           'Onset e offset',       'Legato e staccato',   'Dinâmicas vocais',
  'Vibrato cultivado',   'Revisão — Fase 1',     'Ressonância',         'Articulação',
  'Vogais abertas',      'Agudos sem tensão',    'Graves projetados',   'Saltos de oitava',
  'Revisão parcial',     'Borda do range',       'Transições suaves',   'Bel canto',
  'Vocalizes',           'Expressão musical',    'Messa di voce II',    'Fraseo vocal',
  'Improvisação básica', 'Escalas em contexto',  'Blues e feeling',     'Pentatônica cantada',
  'Scat — introdução',   'Revisão de fase',      'Harmonia vocal',      'Segunda voz',
  'Cantar a terça',      'Fase 2 concluída 🎯',
  // Phase 3 — Avançado (61-90)
  'Falsete avançado',    'Head voice pleno',     'Belting técnico',     'Mix voice avançado',
  'Controle de timbre',  'Revisão — Fase 2',     'Extremos do range',   'Peito alto',
  'Técnica amplificada', 'Presença de palco',    'Projeção acústica',   'Revisão parcial',
  'Storytelling vocal',  'Emoção e técnica',     'Estilos múltiplos',   'Gospel e soul',
  'Jazz vocal avançado', 'Revisão de fase',      'Preparação de estúdio','Repertório',
  'Performance ao vivo', 'Afinação ±2 cents',    'Harmonia avançada',   'Revisão geral',
  'Transposição mental', 'Leitura à vista',      'Improv avançado',     'Identidade vocal',
  'Seu som único',       '90 dias. Mestre. 🏆',
];

const BLURBS: string[] = [
  // Phase 1
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
  // Phase 2
  'O ponto onde grave encontra agudo. O desafio de todo cantor.',
  'Como você entra e sai de uma nota define tudo.',
  'Conectar ou separar notas — duas ferramentas opostas.',
  'A voz tem volume. Aprenda a controlá-lo musicalmente.',
  'Vibrato não é forçado — é liberado. Descubra o seu.',
  'Consolide o que aprendeu. A revisão acelera o aprendizado.',
  'Ressonância frontal, nasal, posterior. Cada uma tem cor.',
  'Consoantes claras fazem a melodia ser entendida.',
  'A vogal que você canta muda o timbre e a projeção.',
  'Agudo com facilidade, não com esforço.',
  'Grave com projeção — não mumble, não força.',
  'A oitava cantada de verdade, sem escalar.',
  'Verifique o progresso. Ajuste o que precisa.',
  'Qual é a sua nota mais alta confortável? E a mais baixa?',
  'Deslizar entre registros sem quebrar.',
  'A arte do belcanto: legato, fraseo, expressão.',
  'Vocalizes italianos treinam a uniformidade das vogais.',
  'Técnica sem expressão é vazia. Expressão sem técnica, também.',
  'Crescer e diminuir em uma nota — controle total.',
  'A respiração guia o fraseo, não ao contrário.',
  'Criar uma melodia na hora, dentro de uma harmonia.',
  'Cantar a escala certa sobre o acorde certo.',
  'O feeling que transforma notas em música.',
  'Cinco notas. Música infinita.',
  'Improvisar com sílabas. O scat do jazz vocal.',
  'Revise toda a Fase 2 antes de avançar.',
  'Duas vozes cantando juntas. Matemática que vira magia.',
  'Harmonizar com outra pessoa é uma habilidade treinável.',
  'A terça abaixo ou acima. Começando a harmonizar.',
  'Dois meses de voz. Você já é outro cantor.',
  // Phase 3
  'O falsete controlado, intencional, belo.',
  'Head voice pleno: som de cabeça com corpo e potência.',
  'Belting com técnica: potente, sustentável, seguro.',
  'O mix — onde grave e agudo se tornam um. O Santo Graal.',
  'Timbre é sua identidade. Aprenda a modulá-lo.',
  'Revisão dos fundamentos: o que ficou fraco?',
  'Os extremos do range existem. Explore com segurança.',
  'Peito alto sem grito — o truque dos vocalistas pop.',
  'Com microfone, tudo muda. Técnica nova, resultado novo.',
  'Presença de palco começa antes de abrir a boca.',
  'Projeção acústica: sem microfone, a voz chega a todo lugar.',
  'Consolide os registros que você está dominando.',
  'Contar histórias com a voz — não só com as palavras.',
  'Emoção genuína não dispensa técnica. Técnica serve à emoção.',
  'Do sertanejo ao jazz: a voz muda, a técnica suporta.',
  'A alma no canto: melismas, fills, dynamic shifts.',
  'Scat avançado, improvisação melódica, bebop vocal.',
  'Revisão ampla antes do sprint final.',
  'Como preparar a voz para uma sessão de estúdio.',
  'Selecionar e preparar peças para apresentação.',
  'A noite do show: rotina, aquecimento, mentalidade.',
  'Afinação de ±2 cents sustentada. Excelência pura.',
  'Ouvir a harmonia completa enquanto canta a melodia.',
  'Tudo que você aprendeu em 84 dias, revisado.',
  'Transpor mentalmente ao cantar — sem papel.',
  'Ler e cantar à primeira vista, sem preparação.',
  'Improvisação total: melodia, harmonia, ritmo, expressão.',
  'Sua voz é única. Seu estilo também.',
  'Ninguém canta exatamente como você. Cultive isso.',
  '90 dias. Você é agora um cantor de verdade.',
];

const WARMUP_DAYS = new Set([
  // Phase 1
  1, 3, 5, 8, 10, 13, 16, 19, 22, 25, 28,
  // Phase 2
  31, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60,
  // Phase 3
  62, 65, 68, 71, 74, 77, 80, 83, 86, 89,
]);

export function buildJourney(): JourneyDay[] {
  const lessons = allLessons();
  const days: JourneyDay[] = [];

  for (let d = 1; d <= 90; d++) {
    const phase = getPhase(d);
    const steps: JourneyStep[] = [];

    // 1) Warmup
    if (WARMUP_DAYS.has(d)) {
      const routineId =
        phase === 1 ? (d <= 10 ? 'quick' : 'complete') :
        phase === 2 ? (d % 2 === 0 ? 'high' : 'low') :
        'complete';
      steps.push({
        kind: 'warmup',
        title: 'Aquecimento vocal',
        view: 'warmup',
        viewOpts: { routineId },
        xp: 12,
      });
    }

    // 2) Lesson — prefer level-appropriate courses
    const levelFilter =
      phase === 1 ? ['beginner'] :
      phase === 2 ? ['beginner', 'intermediate'] :
      ['intermediate', 'advanced'];
    const filteredLessons = lessons.filter(l => levelFilter.includes(l.course.level));
    const lessonPool = filteredLessons.length > 0 ? filteredLessons : lessons;
    const lessonPair = pick(lessonPool, d - 1);
    steps.push({
      kind: 'lesson',
      title: lessonPair.lesson.title,
      view: 'academy',
      viewOpts: { courseId: lessonPair.course.id, lessonId: lessonPair.lesson.id },
      xp: lessonPair.lesson.xp,
    });

    // 3) Practice — level and phase appropriate, rotates each day
    const exLevel =
      (phase === 1 && d <= 12) ? 'beginner' :
      (phase === 1 || phase === 2) ? 'intermediate' :
      'advanced';
    const exIdx =
      phase === 1 ? (d <= 12 ? d - 1 : d - 13) :
      phase === 2 ? d - 31 :
      d - 61;
    const ex = pickExercise(exLevel, exIdx);
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

    // 6) Review at weekly milestones and phase ends
    if (d % 7 === 0 || d === 30 || d === 60 || d === 90) {
      steps.push({ kind: 'review', title: 'Revisão', view: 'progress', xp: 10 });
    }

    days.push({
      day: d,
      phase,
      title: TITLES[d - 1] ?? `Dia ${d}`,
      blurb: BLURBS[d - 1] ?? 'Mais um passo na sua voz.',
      steps,
      totalXp: steps.reduce((s, x) => s + x.xp, 0),
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

export function currentJourneyDay(completedLessons: string[], resultExerciseIds: string[]): number {
  const journey = getJourney();
  let current = 1;
  for (const day of journey) {
    const lessonDone = day.steps
      .filter(s => s.kind === 'lesson')
      .every(s => {
        const id = s.viewOpts?.lessonId;
        return id ? completedLessons.includes(id) : true;
      });
    const practiceDone = day.steps
      .filter(s => s.kind === 'practice')
      .every(s => {
        const id = s.viewOpts?.exerciseIds?.[0];
        return id ? resultExerciseIds.includes(id) : true;
      });
    if (lessonDone && practiceDone) current = day.day + 1;
    else break;
  }
  return Math.min(current, 90);
}

export function isDayComplete(day: JourneyDay, completedLessons: string[], resultExerciseIds: string[]): boolean {
  const lessonDone = day.steps
    .filter(s => s.kind === 'lesson')
    .every(s => {
      const id = s.viewOpts?.lessonId;
      return id ? completedLessons.includes(id) : true;
    });
  const practiceDone = day.steps
    .filter(s => s.kind === 'practice')
    .every(s => {
      const id = s.viewOpts?.exerciseIds?.[0];
      return id ? resultExerciseIds.includes(id) : true;
    });
  return lessonDone && practiceDone;
}
