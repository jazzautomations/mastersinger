import { useStore, getLevelTitle, getLeague, xpForLevel } from '../store/store';
import { t } from '../i18n/strings';
import type { View } from '../types';
import { dailyChallengeExercises } from '../data/exercises';
import { COURSES } from '../data/courses';
import { weekStartISO, todayISO } from '../services/theoryService';
import { Journey } from '../components/Journey';
import { courseTitle, lessonTitle, lessonSummary } from '../services/courseI18n';

interface HomeProps {
  onNavigate: (view: View, opts?: any) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const { profile, isPro, openUpgrade } = useStore();
  const lang = profile.settings.language;
  const today = todayISO();
  const weekStart = weekStartISO();
  const weeklyXpEntry = profile.weeklyXp.find(w => w.weekStart === weekStart);
  const weeklyXp = weeklyXpEntry?.xp ?? 0;
  const league = getLeague(weeklyXp);
  const xpIntoLevel = profile.xp;
  const xpForNext = xpForLevel(profile.level);
  const levelProgress = Math.round((xpIntoLevel / xpForNext) * 100);
  const levelTitle = getLevelTitle(profile.level);

  const dailyExercises = dailyChallengeExercises();
  const dailyDone = profile.dailyChallenge?.date === today && profile.dailyChallenge.completed;

  // Suggest next lesson from in-progress course
  const nextCourse = COURSES.find(c => c.lessons.some(l => !profile.completedLessons.includes(l.id))) ?? COURSES[0];
  const nextLesson = nextCourse?.lessons.find(l => !profile.completedLessons.includes(l.id));

  return (
    <div className="space-y-6 pb-24">
      {/* ── Hero ── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'home.welcome')}</div>
            <h1 className="text-3xl font-black display neon-text tracking-tight">MasterSinger</h1>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'home.league')}</div>
            <div className="text-xl font-black font-mono">{league}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-2xl font-black font-mono neon-text">{profile.streak.current}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{t(lang, 'home.streak_days')}</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-2xl font-black font-mono neon-text">{profile.level}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{levelTitle}</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3">
            <div className="text-2xl font-black font-mono neon-text">{weeklyXp}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{t(lang, 'home.weekly_xp')}</div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono">
            <span>Lv {profile.level}</span>
            <span>{xpIntoLevel}/{xpForNext} XP</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${levelProgress}%` }} />
          </div>
        </div>
      </div>

      {/* ── Upgrade banner for free users ── */}
      {!isPro && (
        <button onClick={() => openUpgrade()} className="card p-4 w-full text-left hover:border-amber-500/40 transition-all border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-violet-500/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div className="flex-1">
              <div className="text-sm font-bold text-amber-200">Desbloqueie todo o app</div>
              <div className="text-[11px] text-slate-400">30+ exercícios, 8 cursos, estúdio MIDI e mais. Teste grátis por 7 dias.</div>
            </div>
            <span className="text-amber-400 text-xs font-mono font-bold">PRO →</span>
          </div>
        </button>
      )}

      {/* ── Guided journey: today's mission ── */}
      <Journey onNavigate={onNavigate} />

      {/* ── Daily challenge ── */}
      <button
        onClick={() => onNavigate('practice', { exerciseIds: dailyExercises.map(e => e.id), isDaily: true })}
        className="card p-6 w-full text-left space-y-2 hover:border-violet-500/40 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'home.dailyChallenge')}</div>
              <div className="text-lg font-bold">{dailyDone ? (lang === 'pt-BR' ? 'Concluído hoje!' : 'Done today!') : (lang === 'pt-BR' ? '3 exercícios · bônus XP' : '3 exercises · bonus XP')}</div>
            </div>
          </div>
          {dailyDone ? <span className="text-green-400 text-xl">✓</span> : <span className="text-violet-400"><i className="fas fa-chevron-right"></i></span>}
        </div>
      </button>

      {/* ── Guided warmup ── */}
      <button
        onClick={() => onNavigate('warmup')}
        className="card p-6 w-full text-left space-y-2 hover:border-cyan-500/40 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'warmup.cta') || (lang === 'pt-BR' ? 'Aquecimento guiado' : 'Guided warmup')}</div>
              <div className="text-lg font-bold">{lang === 'pt-BR' ? 'Aqueça a voz em 5 min' : 'Warm up your voice in 5 min'}</div>
            </div>
          </div>
          <span className="text-cyan-400"><i className="fas fa-chevron-right"></i></span>
        </div>
      </button>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onNavigate('tuner')} className="card p-5 text-left hover:border-cyan-500/40 transition-all">
          <div className="text-3xl mb-2">🎙️</div>
          <div className="text-sm font-bold">{t(lang, 'home.quickTuner')}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{lang === 'pt-BR' ? 'Afine em tempo real' : 'Real-time pitch'}</div>
        </button>
        <button onClick={() => onNavigate('studio')} className="card p-5 text-left hover:border-violet-500/40 transition-all">
          <div className="text-3xl mb-2">📼</div>
          <div className="text-sm font-bold">{t(lang, 'nav.studio')}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{lang === 'pt-BR' ? 'Capture → MIDI' : 'Capture → MIDI'}</div>
        </button>
      </div>

      {/* ── Record video ── */}
      <button
        onClick={() => onNavigate('recorder')}
        className="card p-5 w-full text-left hover:border-pink-500/40 transition-all"
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl">🎬</span>
          <div className="flex-1">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'recorder.title')}</div>
            <div className="text-sm font-bold">{lang === 'pt-BR' ? 'Grave com o afinador na tela' : 'Record with tuner overlay'}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{lang === 'pt-BR' ? 'Compartilhe nas redes sociais' : 'Share on social media'}</div>
          </div>
          <span className="text-pink-400"><i className="fas fa-chevron-right"></i></span>
        </div>
      </button>

      {/* ── Continue learning ── */}
      {nextCourse && nextLesson && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'home.continueLearning')}</div>
          <button onClick={() => onNavigate('academy', { courseId: nextCourse.id, lessonId: nextLesson.id })} className="card p-5 w-full text-left hover:border-white/20 transition-all">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{nextCourse.icon}</div>
              <div className="flex-1">
                <div className="text-xs font-mono" style={{ color: nextCourse.color }}>{courseTitle(nextCourse, lang)}</div>
                <div className="text-base font-bold">{lessonTitle(nextCourse, nextLesson, lang)}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{lessonSummary(nextCourse, nextLesson, lang)}</div>
              </div>
              <span className="text-violet-400"><i className="fas fa-chevron-right"></i></span>
            </div>
          </button>
        </div>
      )}

      {/* ── All courses ── */}
      <div className="space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'nav.academy')}</div>
        <div className="grid gap-3">
          {COURSES.map(course => {
            const completed = course.lessons.filter(l => profile.completedLessons.includes(l.id)).length;
            const pct = Math.round((completed / course.lessons.length) * 100);
            return (
              <button key={course.id} onClick={() => onNavigate('academy', { courseId: course.id })} className="card p-4 text-left hover:border-white/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{course.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{courseTitle(course, lang)}</div>
                    <div className="text-[11px] text-slate-400">{completed}/{course.lessons.length} {t(lang, 'academy.lessons')}</div>
                  </div>
                  <div className="text-xs font-mono text-slate-400">{pct}%</div>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full mt-3 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: course.color }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
