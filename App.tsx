import { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './store/store';
import { AuthGate } from './components/AuthGate';
import { Onboarding } from './components/Onboarding';
import { Landing } from './components/Landing';
import { Home } from './components/Home';
import { Tuner } from './components/Tuner';
import { Practice } from './components/Practice';
import { MelodyStudio } from './components/MelodyStudio';
import { EarTraining } from './components/EarTraining';
import { Theory } from './components/Theory';
import { Harmony } from './components/Harmony';
import { Academy } from './components/Academy';
import { Warmup } from './components/Warmup';
import { Recorder } from './components/Recorder';
import { Progress } from './components/Progress';
import { Settings } from './components/Settings';
import { UpgradeModal } from './components/UpgradeModal';
import { Tutorial, hasTutorialBeenSeen } from './components/Tutorial';
import { t } from './i18n/strings';
import { warmAudioOnUserGesture } from './services/audioService';
import type { View } from './types';

const ONBOARDED_KEY = 'mastersinger:onboarded';
const GUEST_KEY = 'mastersinger:guest';

function MainApp() {
  const { profile, canAccessView, openUpgrade, isPro, authUser } = useStore();
  const lang = profile.settings.language;

  // Detect if URL contains OAuth redirect params.
  // After Google OAuth, Supabase redirects with auth params in:
  //   - Hash fragment: #access_token=xxx      (implicit)
  //   - Query string:  ?code=xxx              (PKCE — auto-processed by detectSessionInUrl)
  // We show the app for hash-based tokens; ?code= is handled by the store.
  const hasAuthParams = () => {
    const h = window.location.hash;
    return h.includes('access_token') || h.includes('refresh_token');
  };

  // Track whether this page load is an OAuth redirect (has ?code= or #access_token).
  // Used to auto-enter the app only after OAuth, not on normal page loads.
  const [isOAuthRedirect] = useState(() => {
    try {
      const h = window.location.hash;
      const q = window.location.search;
      const isRedirect = h.includes('access_token') || h.includes('refresh_token') || q.includes('code=');
      // Clean up stale auth params from URL immediately so they don't
      // cause the app to auto-enter on future normal page loads.
      if (q.includes('code=') || q.includes('state=')) {
        window.history.replaceState(null, '', window.location.pathname + (window.location.hash || ''));
      }
      return isRedirect;
    } catch { return false; }
  });

  const [showApp, setShowApp] = useState<boolean>(() => {
    try {
      const h = window.location.hash;
      return h === '#app' || h.startsWith('#app');
    } catch { return false; }
  });

  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try { return localStorage.getItem(ONBOARDED_KEY) === '1'; } catch { return false; }
  });
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    try { return localStorage.getItem(GUEST_KEY) === '1'; } catch { return false; }
  });
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    if (onboarded) return false;
    return !hasTutorialBeenSeen();
  });
  const [view, setView] = useState<View>('home');
  const [viewOpts, setViewOpts] = useState<any>(null);

  useEffect(() => { warmAudioOnUserGesture(); }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h === '#app' || h.startsWith('#app')) {
        setShowApp(true);
      } else if (h === '' || h === '#') {
        setShowApp(false);
      }
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // After OAuth redirect, Supabase client detects tokens/code from URL,
  // creates session, fires onAuthStateChange → authUser gets set.
  // Only auto-enter the app if we came from an OAuth redirect,
  // not on normal page loads (where we want to show the landing).
  useEffect(() => {
    if (!showApp && authUser && isOAuthRedirect) {
      window.location.hash = '#app';
      setShowApp(true);
    }
  }, [showApp, authUser, isOAuthRedirect]);

  // Also: if Supabase already has a session (e.g. from localStorage),
  // skip straight to app on page load.
  useEffect(() => {
    if (showApp && !authUser && !isGuest) {
      // Supabase session might still be loading — wait a tick
      const t = setTimeout(() => {}, 2000);
      return () => clearTimeout(t);
    }
  }, [showApp, authUser, isGuest]);

  const enterApp = () => {
    window.location.hash = '#app';
    setShowApp(true);
  };

  const enterLanding = () => {
    window.location.hash = '';
    setShowApp(false);
    try { localStorage.removeItem(GUEST_KEY); } catch {}
    setIsGuest(false);
  };

  const handleNavigate = (v: View, opts?: any) => {
    if (!canAccessView(v)) {
      openUpgrade();
      return;
    }
    setView(v);
    setViewOpts(opts ?? null);
  };

  if (!showApp) {
    return <Landing onEnterApp={enterApp} onUpgrade={openUpgrade} onLogin={enterApp} />;
  }

  if (!authUser && !isGuest) {
    return <AuthGate onDone={() => {}} onSkip={() => {
      try { localStorage.setItem(GUEST_KEY, '1'); } catch {}
      setIsGuest(true);
    }} />;
  }

  if (!onboarded) {
    return <Onboarding onDone={() => {
      setOnboarded(true);
      try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch {}
      setShowTutorial(true);
    }} />;
  }

  if (showTutorial) {
    return <Tutorial onDone={() => {
      setShowTutorial(false);
      openUpgrade();
    }} />;
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
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/70 border-b border-white/5" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
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
            <button onClick={() => openUpgrade()} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all font-bold ${isPro ? 'text-amber-300 bg-amber-500/10 hover:bg-amber-500/20' : 'text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'}`} title={isPro ? 'Você é Pro' : 'Assinar Pro'}>
              {isPro ? '👑 Pro' : '⚡ Upgrade'}
            </button>
            <button onClick={enterLanding} className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-all" title="Voltar à página inicial">
              <i className="fas fa-globe"></i>
            </button>
            <button onClick={() => handleNavigate('settings')} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-all">
              <i className="fas fa-cog"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-8">
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
        {view === 'recorder' && <Recorder />}
        {view === 'progress' && <Progress />}
        {view === 'settings' && <Settings />}
      </main>

      <UpgradeModal />

      <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-slate-950/85 border-t border-white/5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
