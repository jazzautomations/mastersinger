import { useState } from 'react';
import { useStore } from '../store/store';
import type { View } from '../types';
import { getJourney, currentJourneyDay, isDayComplete, getPhase, type JourneyDay, type JourneyStep } from '../data/journey';
import { getCourseById } from '../data/courses';
import { lessonTitle } from '../services/courseI18n';

interface JourneyProps {
  onNavigate: (view: View, opts?: any) => void;
}

const STEP_ICONS: Record<JourneyStep['kind'], string> = {
  warmup: '🔥',
  lesson: '📚',
  practice: '💪',
  ear: '👂',
  theory: '🎼',
  review: '📊',
};

const PHASE_META: Record<1 | 2 | 3, { pt: string; en: string; color: string; bg: string }> = {
  1: { pt: 'Fase 1 · Iniciante',     en: 'Phase 1 · Beginner',     color: 'text-emerald-400', bg: '#10b981' },
  2: { pt: 'Fase 2 · Intermediário', en: 'Phase 2 · Intermediate', color: 'text-violet-400',  bg: '#8b5cf6' },
  3: { pt: 'Fase 3 · Avançado',      en: 'Phase 3 · Advanced',     color: 'text-amber-400',   bg: '#f59e0b' },
};

export function Journey({ onNavigate }: JourneyProps) {
  const { profile } = useStore();
  const lang = profile.settings.language;
  const resultExerciseIds = profile.results.map(r => r.exerciseId);
  const todayDay = currentJourneyDay(profile.completedLessons, resultExerciseIds);
  const journey = getJourney();
  const journeyComplete = todayDay > 90;

  const today = journey.find(d => d.day === Math.min(todayDay, 90)) ?? journey[0];
  const completedCount = journey.filter(d => isDayComplete(d, profile.completedLessons, resultExerciseIds)).length;

  const phase = getPhase(Math.min(todayDay, 90));
  const meta = PHASE_META[phase];
  const phaseStart = phase === 1 ? 1 : phase === 2 ? 31 : 61;
  const phaseEnd   = phase === 1 ? 30 : phase === 2 ? 60 : 90;
  const phaseDone  = Math.min(todayDay - phaseStart, phaseEnd - phaseStart + 1);
  const phaseTotal = phaseEnd - phaseStart + 1;

  const stepTitle = (step: JourneyStep): string => {
    if (step.kind === 'lesson') {
      const c = getCourseById(step.viewOpts?.courseId);
      const l = c?.lessons.find(x => x.id === step.viewOpts?.lessonId);
      if (c && l) return lessonTitle(c, l, lang);
    }
    return step.title;
  };

  const stepKindLabel = (kind: JourneyStep['kind']) => {
    const map: Record<JourneyStep['kind'], [string, string]> = {
      warmup:   ['Aquecimento', 'Warmup'],
      lesson:   ['Aula',        'Lesson'],
      practice: ['Prática',     'Practice'],
      ear:      ['Ouvido',      'Ear'],
      theory:   ['Teoria',      'Theory'],
      review:   ['Revisão',     'Review'],
    };
    return lang === 'pt-BR' ? map[kind][0] : map[kind][1];
  };

  // ── All 90 days done ──
  if (journeyComplete) {
    return (
      <div className="card p-6 space-y-4 text-center">
        <div className="text-5xl">🏆</div>
        <h2 className="text-2xl font-black display tracking-tight">
          {lang === 'pt-BR' ? '90 dias concluídos!' : '90 days complete!'}
        </h2>
        <p className="text-sm text-slate-400">
          {lang === 'pt-BR'
            ? 'Você completou as 3 fases. Os exercícios, treino de ouvido e estúdio MIDI são suas ferramentas diárias daqui pra frente.'
            : 'You completed all 3 phases. Exercises, ear training, and MIDI studio are your daily tools from here on.'}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={() => onNavigate('practice')} className="btn-primary">
            💪 {lang === 'pt-BR' ? 'Praticar' : 'Practice'}
          </button>
          <button onClick={() => onNavigate('ear')} className="btn-ghost">
            👂 {lang === 'pt-BR' ? 'Treinar ouvido' : 'Ear training'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Today's mission ── */}
      <div className="card p-6 space-y-4 ring-pop">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-[10px] uppercase tracking-wider font-mono ${meta.color}`}>
              {lang === 'pt-BR' ? meta.pt : meta.en}
            </div>
            <h2 className="text-2xl font-black display tracking-tight">
              {lang === 'pt-BR' ? `Dia ${today.day}` : `Day ${today.day}`}
              <span className="text-violet-400"> · {today.title}</span>
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">{today.blurb}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black font-mono neon-text">{phaseDone}/{phaseTotal}</div>
            <div className="text-[10px] text-slate-400 font-mono">+{today.totalXp} XP</div>
          </div>
        </div>

        {/* Phase progress bar */}
        <div>
          <div className="flex justify-between text-[9px] text-slate-500 font-mono mb-1">
            <span>{lang === 'pt-BR' ? `Dia ${phaseStart}` : `Day ${phaseStart}`}</span>
            <span>{lang === 'pt-BR' ? `Dia ${phaseEnd}` : `Day ${phaseEnd}`}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(Math.max(phaseDone, 0) / phaseTotal) * 100}%`, background: meta.bg }}
            />
          </div>
          <div className="text-[9px] text-slate-500 font-mono mt-1 text-right">
            {completedCount}/90 {lang === 'pt-BR' ? 'dias totais' : 'total days'}
          </div>
        </div>

        {/* Today's steps */}
        <div className="grid gap-2">
          {today.steps.map((step, i) => {
            const done =
              (step.kind === 'lesson' && step.viewOpts?.lessonId && profile.completedLessons.includes(step.viewOpts.lessonId)) ||
              (step.kind === 'practice' && step.viewOpts?.exerciseIds?.[0] && resultExerciseIds.includes(step.viewOpts.exerciseIds[0]));
            return (
              <button
                key={i}
                onClick={() => onNavigate(step.view, step.viewOpts)}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  done ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}
              >
                <span className="text-xl w-8 text-center">{done ? '✓' : STEP_ICONS[step.kind]}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${done ? 'text-green-300' : ''}`}>{stepTitle(step)}</div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{stepKindLabel(step.kind)}</div>
                </div>
                <span className="text-xs text-violet-400 font-mono">+{step.xp}</span>
                {!done && <span className="text-violet-400"><i className="fas fa-chevron-right"></i></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Upcoming days ── */}
      <div className="space-y-2">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
          {lang === 'pt-BR' ? 'Próximos dias' : 'Upcoming days'}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {journey.slice(todayDay, todayDay + 5).map((d: JourneyDay) => (
            <div key={d.day} className="card p-2 text-center">
              <div className="text-[10px] text-slate-500 font-mono">{lang === 'pt-BR' ? 'Dia' : 'Day'} {d.day}</div>
              <div className="text-[10px] text-slate-300 truncate">{d.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Phase map (collapsible) ── */}
      <PhaseMap
        journey={journey}
        todayDay={todayDay}
        currentPhase={phase}
        completedLessons={profile.completedLessons}
        resultExerciseIds={resultExerciseIds}
        onJump={(day) => onNavigate('practice', day.steps.find(s => s.kind === 'practice')?.viewOpts)}
        lang={lang}
      />
    </div>
  );
}

function PhaseMap({
  journey,
  todayDay,
  currentPhase,
  completedLessons,
  resultExerciseIds,
  onJump,
  lang,
}: {
  journey: JourneyDay[];
  todayDay: number;
  currentPhase: 1 | 2 | 3;
  completedLessons: string[];
  resultExerciseIds: string[];
  onJump: (day: JourneyDay) => void;
  lang: 'pt-BR' | 'en';
}) {
  const [openPhase, setOpenPhase] = useState<number>(currentPhase);

  const phases: { phase: 1 | 2 | 3; label: string; days: JourneyDay[] }[] = [
    { phase: 1, label: lang === 'pt-BR' ? 'Fase 1 — Iniciante (1-30)'      : 'Phase 1 — Beginner (1-30)',      days: journey.slice(0, 30)  },
    { phase: 2, label: lang === 'pt-BR' ? 'Fase 2 — Intermediário (31-60)'  : 'Phase 2 — Intermediate (31-60)', days: journey.slice(30, 60) },
    { phase: 3, label: lang === 'pt-BR' ? 'Fase 3 — Avançado (61-90)'       : 'Phase 3 — Advanced (61-90)',     days: journey.slice(60, 90) },
  ];

  const chipColors: Record<number, string> = {
    1: 'bg-emerald-500/20 text-emerald-300',
    2: 'bg-violet-500/20 text-violet-300',
    3: 'bg-amber-500/20 text-amber-300',
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
        {lang === 'pt-BR' ? 'Trilha completa — 90 dias · 3 fases' : 'Full path — 90 days · 3 phases'}
      </div>
      {phases.map(({ phase, label, days }) => {
        const phaseDone = days.filter(d => isDayComplete(d, completedLessons, resultExerciseIds)).length;
        const isOpen = openPhase === phase;
        return (
          <div key={phase} className="space-y-2">
            <button
              onClick={() => setOpenPhase(isOpen ? 0 : phase)}
              className="w-full flex items-center gap-2 text-left"
            >
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${chipColors[phase]}`}>
                {lang === 'pt-BR' ? `F${phase}` : `P${phase}`}
              </span>
              <span className="text-xs text-slate-300 flex-1 truncate">{label}</span>
              <span className="text-[10px] text-slate-500 font-mono">{phaseDone}/30</span>
              <span className="text-slate-500 text-[10px]">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="grid grid-cols-10 gap-1">
                {days.map(d => {
                  const done = isDayComplete(d, completedLessons, resultExerciseIds);
                  const isToday = d.day === todayDay;
                  return (
                    <button
                      key={d.day}
                      onClick={() => onJump(d)}
                      title={`Dia ${d.day}: ${d.title}`}
                      className={`aspect-square rounded-md text-[9px] font-mono flex items-center justify-center transition-all ${
                        done    ? 'bg-green-500/30 text-green-200' :
                        isToday ? 'bg-violet-500 text-white ring-2 ring-violet-300' :
                        d.day < todayDay ? 'bg-white/5 text-slate-500' :
                        'bg-white/5 text-slate-600'
                      }`}
                    >
                      {d.day}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
