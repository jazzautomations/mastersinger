import { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './store/store';
import { AuthGate } from './components/AuthGate';
import { Onboarding } from './components/Onboarding';
import { Landing } from './components/Landing';
import { Home } from './components/Home';
import { Tuner } from './components/Tuner';
import { Practice } from './components/Practice';
import { Performance } from './components/Performance';
import { MelodyStudio } from './components/MelodyStudio';
import { EarTraining } from './components/EarTraining';
import { Theory } from './components/Theory';
import { Harmony } from './components/Harmony';
import { Rhythm } from './components/Rhythm';
import { Academy } from './components/Academy';
import { Warmup } from './components/Warmup';
import { Recorder } from './components/Recorder';
import { Progress } from './components/Progress';
import { Settings } from './components/Settings';
import { UpgradeModal } from './components/UpgradeModal';
import { ProOverlay } from './components/ProOverlay';
import { Tutorial, hasTutorialBeenSeen } from './components/Tutorial';
import { TeacherDashboard } from './components/TeacherDashboard';
import { t } from './i18n/strings';
import { warmAudioOnUserGesture } from './services/audioService';
import type { View } from './types';

const ONBOARDED_KEY = 'mastersinger:onboarded';

function MainApp() {
  const { profile, canAccessView, openUpgrade, isPro, isTeacher, authUser, refreshSubscription } = useStore();
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
      return h === '#app' || h.startsWith('#app') || h === '#teacher';
    } catch { return false; }
  });

  const [onboarded, setOnboarded] = useState<boolean>(() => {
    try { return localStorage.getItem(ONBOARDED_KEY) === '1'; } catch { return false; }
  });
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    if (onboarded) return false;
    return !hasTutorialBeenSeen();
  });
  const [view, setView] = useState<View>('home');
  const [viewOpts, setViewOpts] = useState<any>(null);
  const [checkoutBanner, setCheckoutBanner] = useState<'success' | 'cancelled' | 'expired' | null>(null);

  // Detect checkout result from Asaas callback URL (#app?checkout=success&plan=...)
  useEffect(() => {
    const raw = window.location.hash; // e.g. "#app?checkout=success&plan=pro-monthly"
    const qStart = raw.indexOf('?');
    if (qStart === -1) return;
    const params = new URLSearchParams(raw.slice(qStart + 1));
    const result = params.get('checkout');
    if (!result) return;
    // Clean the query params from the hash so refreshes don't re-trigger
    window.history.replaceState(null, '', window.location.pathname + '#app');
    if (result === 'success') {
      setCheckoutBanner('success');
      void refreshSubscription();
      setTimeout(() => setCheckoutBanner(null), 8000);
    } else if (result === 'cancelled') {
      setCheckoutBanner('cancelled');
      setTimeout(() => setCheckoutBanner(null), 5000);
    } else if (result === 'expired') {
      setCheckoutBanner('expired');
      setTimeout(() => setCheckoutBanner(null), 5000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { warmAudioOnUserGesture(); }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [view]);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h === '#app' || h.startsWith('#app') || h === '#teacher') {
        setShowApp(true);
      } else if (h === '' || h === '#') {
        setShowApp(false);
      }
      if (h === '#teacher') {
        setView('teacher');
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
  // Show loading spinner while auth session is loading to avoid flash-of-AuthGate.
  const [authLoading, setAuthLoading] = useState(() => showApp);
  useEffect(() => {
    if (showApp && !authUser && authLoading) {
      const t = setTimeout(() => setAuthLoading(false), 2000);
      return () => clearTimeout(t);
    }
    if (authUser) setAuthLoading(false);
  }, [showApp, authUser, authLoading]);

  const enterApp = () => {
    window.location.hash = '#app';
    setShowApp(true);
  };

  const enterLanding = () => {
    window.location.hash = '';
    setShowApp(false);
  };

  const handleNavigate = (v: View, opts?: any) => {
    setView(v);
    setViewOpts(opts ?? null);
    if (v === 'teacher') {
      window.location.hash = '#teacher';
    }
  };

  // 404 for unknown views
  const validViews: View[] = ['home','tuner','practice','performance','studio','ear','theory','harmony','rhythm','academy','progress','settings','warmup','recorder','teacher'];
  const is404 = !validViews.includes(view);

  if (!showApp) {
    return <Landing onEnterApp={enterApp} onUpgrade={openUpgrade} onLogin={enterApp} />;
  }

  if (authLoading && !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthGate onDone={() => {}} />;
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
    { view: 'recorder', icon: '🎬', labelKey: 'recorder.navLabel' },
    { view: 'academy',  icon: '🎓', labelKey: 'nav.academy' },
    { view: 'studio',   icon: '📼', labelKey: 'nav.studio' },
    { view: 'settings', icon: '⚙️', labelKey: 'nav.settings' },
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
            <button onClick={() => handleNavigate('theory')} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${!canAccessView('theory') ? 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10' : 'text-slate-400 hover:text-violet-300 hover:bg-white/5'}`}>
              {t(lang, 'nav.theory')} {!canAccessView('theory') && '🔒'}
            </button>
            <button onClick={() => handleNavigate('harmony')} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${!canAccessView('harmony') ? 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10' : 'text-slate-400 hover:text-violet-300 hover:bg-white/5'}`}>
              {t(lang, 'nav.harmony')} {!canAccessView('harmony') && '🔒'}
            </button>
            <button onClick={() => handleNavigate('rhythm')} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${!canAccessView('rhythm') ? 'text-slate-500 hover:text-amber-300 hover:bg-amber-500/10' : 'text-slate-400 hover:text-violet-300 hover:bg-white/5'}`}>
              {t(lang, 'nav.rhythm')} {!canAccessView('rhythm') && '🔒'}
            </button>
            {isTeacher && (
              <button onClick={() => handleNavigate('teacher')} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${view === 'teacher' ? 'text-cyan-300 bg-cyan-500/10' : 'text-cyan-400 hover:text-cyan-300 hover:bg-white/5'}`}>
                🎓 Professor
              </button>
            )}
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

      {checkoutBanner && (
        <div className={`fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none`}>
          <div className={`pointer-events-auto max-w-sm w-full rounded-2xl px-5 py-4 shadow-2xl border text-sm font-semibold flex items-center gap-3 animate-fade-in
            ${checkoutBanner === 'success' ? 'bg-green-500/20 border-green-400/40 text-green-200' : 'bg-amber-500/20 border-amber-400/40 text-amber-200'}`}>
            <span className="text-xl">{checkoutBanner === 'success' ? '🎉' : '⚠️'}</span>
            <span>
              {checkoutBanner === 'success'
                ? (lang === 'pt-BR' ? 'Pagamento confirmado! Bem-vindo ao Pro 👑' : 'Payment confirmed! Welcome to Pro 👑')
                : checkoutBanner === 'cancelled'
                ? (lang === 'pt-BR' ? 'Checkout cancelado. Sem cobranças.' : 'Checkout cancelled. No charges made.')
                : (lang === 'pt-BR' ? 'Link de pagamento expirado. Tente novamente.' : 'Payment link expired. Please try again.')}
            </span>
            <button onClick={() => setCheckoutBanner(null)} className="ml-auto text-current opacity-60 hover:opacity-100">✕</button>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6 pb-8">
        {is404 && (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl">🎤</div>
            <h2 className="text-2xl font-black display">Página não encontrada</h2>
            <p className="text-sm text-slate-400">O que você procura não existe aqui.</p>
            <button onClick={() => handleNavigate('home')} className="btn-primary text-xs px-6 py-3 mt-4">Voltar ao início</button>
          </div>
        )}
        {view === 'home'     && <Home onNavigate={handleNavigate} />}
        {view === 'tuner'    && <Tuner />}
        {view === 'practice' && <Practice
                                  preselectedExerciseIds={viewOpts?.exerciseIds}
                                  isDaily={viewOpts?.isDaily}
                                  customExercise={viewOpts?.customExercise}
                                  onComplete={() => handleNavigate('home')}
                                />}
        {view === 'performance' && <Performance onComplete={() => handleNavigate('home')} />}
        {view === 'studio'   && <ProOverlay view={view} viewName={t(lang, 'nav.studio')}><MelodyStudio onNavigate={handleNavigate} /></ProOverlay>}
        {view === 'ear'      && <ProOverlay view={view} viewName={t(lang, 'nav.ear')}><EarTraining /></ProOverlay>}
        {view === 'theory'   && <ProOverlay view={view} viewName={t(lang, 'nav.theory')}><Theory /></ProOverlay>}
        {view === 'harmony'  && <ProOverlay view={view} viewName={t(lang, 'nav.harmony')}><Harmony /></ProOverlay>}
        {view === 'rhythm'   && <ProOverlay view={view} viewName={t(lang, 'nav.rhythm')}><Rhythm /></ProOverlay>}
        {view === 'academy'  && <Academy initialCourseId={viewOpts?.courseId} initialLessonId={viewOpts?.lessonId} onNavigate={handleNavigate} />}
        {view === 'warmup'   && <Warmup routineId={viewOpts?.routineId} onExit={() => handleNavigate('home')} />}
        {view === 'recorder' && <Recorder />}
        {view === 'progress' && <Progress />}
        {view === 'settings' && <Settings />}
        {view === 'teacher'  && <TeacherDashboard />}
      </main>

      <UpgradeModal />

      <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-slate-950/85 border-t border-white/5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-3xl mx-auto px-2 py-2 grid grid-cols-7 gap-0.5">
          {navItems.map(item => {
            const locked = !canAccessView(item.view);
            return (
              <button
                key={item.view}
                onClick={() => handleNavigate(item.view)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all ${view === item.view ? 'text-violet-400 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <span className="text-base">{item.icon}</span>
                <span className="text-[9px] font-mono uppercase tracking-wider flex items-center gap-0.5">
                  {t(lang, item.labelKey)}
                  {locked && <span className="text-[8px]">🔒</span>}
                </span>
              </button>
            );
          })}
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
