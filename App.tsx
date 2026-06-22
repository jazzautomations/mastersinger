import { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './store/store';
import { Onboarding } from './components/Onboarding';
import { Home } from './components/Home';
import { Tuner } from './components/Tuner';
import { Practice } from './components/Practice';
import { MelodyStudio } from './components/MelodyStudio';
import { EarTraining } from './components/EarTraining';
import { Theory } from './components/Theory';
import { Harmony } from './components/Harmony';
import { Academy } from './components/Academy';
import { Warmup } from './components/Warmup';
import { Progress } from './components/Progress';
import { Settings } from './components/Settings';
import { t } from './i18n/strings';
import { warmAudioOnUserGesture } from './services/audioService';
import type { View } from './types';

const ONBOARDED_KEY = 'mastersinger:onboarded';

function MainApp() {
  const { profile } = useStore();
  const lang = profile.settings.language;
  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try { return localStorage.getItem(ONBOARDED_KEY) === '1'; } catch { return false; }
  });
  const [view, setView] = useState<View>('home');
  const [viewOpts, setViewOpts] = useState<any>(null);

  // Warm up the Web Audio context on the first user gesture so every later
  // audio call (tuner reference, ear-training playback, practice guide) finds
  // a running context. Fixes the autoplay-policy "no sound" bug globally.
  useEffect(() => { warmAudioOnUserGesture(); }, []);

  // scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const handleNavigate = (v: View, opts?: any) => {
    setView(v);
    setViewOpts(opts ?? null);
  };

  if (!onboarded) {
    return <Onboarding onDone={() => { setOnboarded(true); try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch {} }} />;
  }

  const navItems: { view: View; icon: string; labelKey: string }[] = [
    { view: 'home',     icon: '🏠', labelKey: 'nav.home' },
    { view: 'tuner',    icon: '🎙️', labelKey: 'nav.tuner' },
    { view: 'practice', icon: '💪', labelKey: 'nav.practice' },
    { view: 'studio',   icon: '📼', labelKey: 'nav.studio' },
    { view: 'ear',      icon: '👂', labelKey: 'nav.ear' },
    { view: 'academy',  icon: '🎓', labelKey: 'nav.academy' },
    { view: 'progress', icon: '📊', labelKey: 'nav.progress' },
  ];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/70 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => handleNavigate('home')} className="flex items-center gap-2">
            <span className="text-xl">🎤</span>
            <span className="text-sm font-black display neon-text hidden sm:block">MasterSinger</span>
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => handleNavigate('theory')} className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-all">
              {t(lang, 'nav.theory')}
            </button>
            <button onClick={() => handleNavigate('harmony')} className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-all">
              {t(lang, 'nav.harmony')}
            </button>
            <button onClick={() => handleNavigate('settings')} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-all">
              <i className="fas fa-cog"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {view === 'home'     && <Home onNavigate={handleNavigate} />}
        {view === 'tuner'    && <Tuner />}
        {view === 'practice' && <Practice
                                  preselectedExerciseIds={viewOpts?.exerciseIds}
                                  isDaily={viewOpts?.isDaily}
                                  onComplete={() => handleNavigate('home')}
                                />}
        {view === 'studio'   && <MelodyStudio />}
        {view === 'ear'      && <EarTraining />}
        {view === 'theory'   && <Theory />}
        {view === 'harmony'  && <Harmony />}
        {view === 'academy'  && <Academy initialCourseId={viewOpts?.courseId} initialLessonId={viewOpts?.lessonId} />}
        {view === 'warmup'   && <Warmup routineId={viewOpts?.routineId} onExit={() => handleNavigate('home')} />}
        {view === 'progress' && <Progress />}
        {view === 'settings' && <Settings />}
      </main>

      {/* Bottom nav (mobile-friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-slate-950/85 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-2 py-2 grid grid-cols-7 gap-0.5">
          {navItems.map(item => (
            <button
              key={item.view}
              onClick={() => handleNavigate(item.view)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all ${view === item.view ? 'text-violet-400 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-[9px] font-mono uppercase tracking-wider">{t(lang, item.labelKey)}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MainApp />
    </StoreProvider>
  );
}
