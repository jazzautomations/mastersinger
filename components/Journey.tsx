import { useState } from 'react';
import { useStore } from '../store/store';
import type { View } from '../types';
import {
  getJourney, currentJourneyDay, isDayComplete, getMonth, getMonthProgress,
  MONTH_NAMES, type JourneyDay, type JourneyStep,
} from '../data/journey';
import { getCourseById } from '../data/courses';
import { lessonTitle } from '../services/courseI18n';

interface JourneyProps {
  onNavigate: (view: View, opts?: any) => void;
}

const STEP_ICONS: Record<JourneyStep['kind'], string> = {
  warmup: '🔥', lesson: '📚', practice: '💪',
  ear: '👂', theory: '🎼', review: '📊',
};

// 12 month colors cycling through the spectrum
const MONTH_COLORS = [
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#ec4899', '#f43f5e', '#22c55e', '#f59e0b',
];

export function Journey({ onNavigate }: JourneyProps) {
  const { profile } = useStore();
  const lang = profile.settings.language;
  const resultIds = profile.results.map(r => r.exerciseId);
  const todayDay = currentJourneyDay(profile.completedLessons, resultIds);
  const journey = getJourney();
  const done = todayDay > 365;

  const today = journey.find(d => d.day === Math.min(todayDay, 365)) ?? journey[0];
  const completedCount = journey.filter(d => isDayComplete(d, profile.completedLessons, resultIds)).length;
  const month = getMonth(Math.min(todayDay, 365));
  const { done: mDone, total: mTotal, start: mStart, end: mEnd } = getMonthProgress(Math.min(todayDay, 365));
  const color = MONTH_COLORS[month - 1];
  const monthName = MONTH_NAMES[month - 1];

  const stepTitle = (step: JourneyStep): string => {
    if (step.kind === 'lesson') {
      const c = getCourseById(step.viewOpts?.courseId);
      const l = c?.lessons.find(x => x.id === step.viewOpts?.lessonId);
      if (c && l) return lessonTitle(c, l, lang);
    }
    return step.title;
  };

  const kindLabel = (kind: JourneyStep['kind']) => {
    const m: Record<JourneyStep['kind'], [string, string]> = {
      warmup: ['Aquecimento','Warmup'], lesson: ['Aula','Lesson'],
      practice: ['Prática','Practice'], ear: ['Ouvido','Ear'],
      theory: ['Teoria','Theory'], review: ['Revisão','Review'],
    };
    return lang === 'pt-BR' ? m[kind][0] : m[kind][1];
  };

  if (done) {
    return (
      <div className="card p-6 space-y-4 text-center">
        <div className="text-5xl">🏆</div>
        <h2 className="text-2xl font-black display tracking-tight">
          {lang === 'pt-BR' ? '365 dias concluídos!' : '365 days complete!'}
        </h2>
        <p className="text-sm text-slate-400">
          {lang === 'pt-BR'
            ? 'Um ano inteiro de treino vocal. Os exercícios, treino de ouvido e estúdio MIDI são suas ferramentas para sempre.'
            : 'A full year of vocal training. Exercises, ear training, and MIDI studio are your forever tools.'}
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={() => onNavigate('practice')} className="btn-primary">💪 {lang === 'pt-BR' ? 'Praticar' : 'Practice'}</button>
          <button onClick={() => onNavigate('ear')} className="btn-ghost">👂 {lang === 'pt-BR' ? 'Ouvido' : 'Ear'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Today card */}
      <div className="card p-6 space-y-4 ring-pop">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color }}>
              {lang === 'pt-BR' ? `Mês ${month} · ${monthName}` : `Month ${month} · ${monthName}`}
            </div>
            <h2 className="text-2xl font-black display tracking-tight">
              {lang === 'pt-BR' ? `Dia ${today.day}` : `Day ${today.day}`}
              <span className="text-violet-400"> · {today.title}</span>
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">{today.blurb}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black font-mono neon-text">{mDone}/{mTotal}</div>
            <div className="text-[10px] text-slate-400 font-mono">+{today.totalXp} XP</div>
          </div>
        </div>

        {/* Month progress bar */}
        <div>
          <div className="flex justify-between text-[9px] text-slate-500 font-mono mb-1">
            <span>{lang === 'pt-BR' ? `Dia ${mStart}` : `Day ${mStart}`}</span>
            <span>{lang === 'pt-BR' ? `Dia ${mEnd}` : `Day ${mEnd}`}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(Math.max(mDone,0)/mTotal)*100}%`, background: color }} />
          </div>
          <div className="text-[9px] text-slate-500 font-mono mt-1 text-right">
            {completedCount}/365 {lang === 'pt-BR' ? 'dias totais' : 'total days'}
          </div>
        </div>

        {/* Steps */}
        <div className="grid gap-2">
          {today.steps.map((step, i) => {
            const stepDone =
              (step.kind === 'lesson' && step.viewOpts?.lessonId && profile.completedLessons.includes(step.viewOpts.lessonId)) ||
              (step.kind === 'practice' && step.viewOpts?.exerciseIds?.[0] && resultIds.includes(step.viewOpts.exerciseIds[0]));
            return (
              <button key={i} onClick={() => onNavigate(step.view, step.viewOpts)}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                  stepDone ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 hover:bg-white/10 border border-transparent'
                }`}>
                <span className="text-xl w-8 text-center">{stepDone ? '✓' : STEP_ICONS[step.kind]}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${stepDone ? 'text-green-300' : ''}`}>{stepTitle(step)}</div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{kindLabel(step.kind)}</div>
                </div>
                <span className="text-xs text-violet-400 font-mono">+{step.xp}</span>
                {!stepDone && <span className="text-violet-400"><i className="fas fa-chevron-right" /></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming */}
      <div className="space-y-2">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
          {lang === 'pt-BR' ? 'Próximos dias' : 'Upcoming days'}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {journey.slice(todayDay, todayDay + 5).map(d => (
            <div key={d.day} className="card p-2 text-center">
              <div className="text-[10px] text-slate-500 font-mono">{lang === 'pt-BR' ? 'Dia' : 'Day'} {d.day}</div>
              <div className="text-[10px] text-slate-300 truncate">{d.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 12-month map */}
      <MonthMap
        journey={journey}
        todayDay={todayDay}
        currentMonth={month}
        completedLessons={profile.completedLessons}
        resultIds={resultIds}
        onJump={d => onNavigate('practice', d.steps.find(s => s.kind === 'practice')?.viewOpts)}
        lang={lang}
      />
    </div>
  );
}

function MonthMap({ journey, todayDay, currentMonth, completedLessons, resultIds, onJump, lang }: {
  journey: JourneyDay[];
  todayDay: number;
  currentMonth: number;
  completedLessons: string[];
  resultIds: string[];
  onJump: (d: JourneyDay) => void;
  lang: 'pt-BR' | 'en';
}) {
  const [openMonth, setOpenMonth] = useState<number>(currentMonth);

  return (
    <div className="card p-4 space-y-3">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
        {lang === 'pt-BR' ? 'Jornada completa — 365 dias · 12 meses' : 'Full journey — 365 days · 12 months'}
      </div>
      {MONTH_NAMES.map((name, idx) => {
        const m = idx + 1;
        const color = MONTH_COLORS[idx];
        const mDays = journey.filter(d => d.month === m);
        const mDone = mDays.filter(d => isDayComplete(d, completedLessons, resultIds)).length;
        const isOpen = openMonth === m;
        return (
          <div key={m} className="space-y-2">
            <button onClick={() => setOpenMonth(isOpen ? 0 : m)} className="w-full flex items-center gap-2 text-left">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${color}22`, color }}>
                {lang === 'pt-BR' ? `M${m}` : `M${m}`}
              </span>
              <span className="text-xs text-slate-300 flex-1 truncate">{lang === 'pt-BR' ? `Mês ${m} — ${name}` : `Month ${m} — ${name}`}</span>
              <span className="text-[10px] text-slate-500 font-mono">{mDone}/{mDays.length}</span>
              <span className="text-slate-500 text-[10px]">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="grid grid-cols-10 gap-1">
                {mDays.map(d => {
                  const done = isDayComplete(d, completedLessons, resultIds);
                  const isToday = d.day === todayDay;
                  return (
                    <button key={d.day} onClick={() => onJump(d)} title={`Dia ${d.day}: ${d.title}`}
                      className={`aspect-square rounded-md text-[9px] font-mono flex items-center justify-center transition-all ${
                        done ? 'bg-green-500/30 text-green-200' :
                        isToday ? 'bg-violet-500 text-white ring-2 ring-violet-300' :
                        d.day < todayDay ? 'bg-white/5 text-slate-500' : 'bg-white/5 text-slate-600'
                      }`}>
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
