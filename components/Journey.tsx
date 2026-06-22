import { useStore } from '../store/store';
import { t } from '../i18n/strings';
import type { View } from '../types';
import { getJourney, currentJourneyDay, isDayComplete, type JourneyDay, type JourneyStep } from '../data/journey';
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

export function Journey({ onNavigate }: JourneyProps) {
  const { profile } = useStore();
  const lang = profile.settings.language;
  const resultExerciseIds = profile.results.map(r => r.exerciseId);
  const todayDay = currentJourneyDay(profile.completedLessons, resultExerciseIds);
  const journey = getJourney();

  const today = journey.find(d => d.day === todayDay) ?? journey[0];
  const completedCount = journey.filter(d => isDayComplete(d, profile.completedLessons, resultExerciseIds)).length;

  const startStep = (step: JourneyStep) => {
    onNavigate(step.view, step.viewOpts);
  };

  // Resolve a step's title in the user's language (lesson steps are stored as
  // the original English title in the journey data; localize them on render).
  const stepTitle = (step: JourneyStep): string => {
    if (step.kind === 'lesson') {
      const courseId = step.viewOpts?.courseId;
      const lessonId = step.viewOpts?.lessonId;
      if (courseId && lessonId) {
        const c = getCourseById(courseId);
        const l = c?.lessons.find(x => x.id === lessonId);
        if (c && l) return lessonTitle(c, l, lang);
      }
    }
    return step.title;
  };

  return (
    <div className="space-y-5">
      {/* ── Today's mission ── */}
      <div className="card p-6 space-y-4 ring-pop">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              {lang === 'pt-BR' ? 'Sua trilha de 30 dias' : 'Your 30-day path'}
            </div>
            <h2 className="text-2xl font-black display tracking-tight">
              {lang === 'pt-BR' ? `Dia ${today.day}` : `Day ${today.day}`}
              <span className="text-violet-400"> · {today.title}</span>
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">{today.blurb}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black font-mono neon-text">{today.day}/30</div>
            <div className="text-[10px] text-slate-400 font-mono">+{today.totalXp} XP</div>
          </div>
        </div>

        {/* progress through the 30 days */}
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / 30) * 100}%` }}
          />
        </div>

        {/* today's steps */}
        <div className="grid gap-2">
          {today.steps.map((step, i) => {
            const done =
              (step.kind === 'lesson' && step.viewOpts?.lessonId && profile.completedLessons.includes(step.viewOpts.lessonId)) ||
              (step.kind === 'practice' && step.viewOpts?.exerciseIds?.[0] && resultExerciseIds.includes(step.viewOpts.exerciseIds[0]));
            return (
              <button
                key={i}
                onClick={() => startStep(step)}
                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all ${done ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}
              >
                <span className="text-xl w-8 text-center">{done ? '✓' : STEP_ICONS[step.kind]}</span>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold truncate ${done ? 'text-green-300' : ''}`}>{stepTitle(step)}</div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    {step.kind === 'warmup' ? (lang === 'pt-BR' ? 'Aquecimento' : 'Warmup')
                      : step.kind === 'lesson' ? (lang === 'pt-BR' ? 'Aula' : 'Lesson')
                      : step.kind === 'practice' ? (lang === 'pt-BR' ? 'Prática' : 'Practice')
                      : step.kind === 'ear' ? (lang === 'pt-BR' ? 'Ouvido' : 'Ear')
                      : step.kind === 'theory' ? (lang === 'pt-BR' ? 'Teoria' : 'Theory')
                      : (lang === 'pt-BR' ? 'Revisão' : 'Review')}
                  </div>
                </div>
                <span className="text-xs text-violet-400 font-mono">+{step.xp}</span>
                {!done && <span className="text-violet-400"><i className="fas fa-chevron-right"></i></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Upcoming days (compact) ── */}
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

      {/* ── Full path toggle: jump to any day ── */}
      <JourneyMap
        journey={journey}
        todayDay={todayDay}
        completedLessons={profile.completedLessons}
        resultExerciseIds={resultExerciseIds}
        onJump={(day) => onNavigate('practice', day.steps.find(s => s.kind === 'practice')?.viewOpts)}
        lang={lang}
      />
    </div>
  );
}

function JourneyMap({
  journey,
  todayDay,
  completedLessons,
  resultExerciseIds,
  onJump,
  lang,
}: {
  journey: JourneyDay[];
  todayDay: number;
  completedLessons: string[];
  resultExerciseIds: string[];
  onJump: (day: JourneyDay) => void;
  lang: 'pt-BR' | 'en';
}) {
  return (
    <div className="card p-4 space-y-2">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
        {lang === 'pt-BR' ? 'Trilha completa' : 'Full path'}
      </div>
      <div className="grid grid-cols-10 gap-1">
        {journey.map(d => {
          const done = isDayComplete(d, completedLessons, resultExerciseIds);
          const isToday = d.day === todayDay;
          return (
            <button
              key={d.day}
              onClick={() => onJump(d)}
              title={`Dia ${d.day}: ${d.title}`}
              className={`aspect-square rounded-md text-[9px] font-mono flex items-center justify-center transition-all ${
                done ? 'bg-green-500/30 text-green-200' :
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
    </div>
  );
}
