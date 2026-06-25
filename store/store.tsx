import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import type { UserProfile, ExerciseResult, StudentLevel, Language, League, SavedMelody, Note, View } from '../types';
import { todayISO, weekStartISO, classifyVoiceType } from '../services/theoryService';
import { getSupabaseClient } from '../services/supabase';
import {
  type Subscription,
  isSubscriptionActive,
  canAccessView as entCanAccessView,
  canAccessCourse as entCanAccessCourse,
  canAccessExercise as entCanAccessExercise,
} from '../services/entitlements';
import type { PlanId } from '../data/pricing';

const STORAGE_KEY = 'mastersinger:v1';
const MELODIES_KEY = 'mastersinger:melodies';
const SYNC_KEY = 'mastersinger:sync';

const DEFAULT_PROFILE: UserProfile = {
  level: 1,
  xp: 0,
  badges: [],
  streak: { current: 0, longest: 0, lastActiveDate: '', freezes: 1 },
  weeklyXp: [],
  range: {},
  settings: { language: 'pt-BR', a4: 440, level: 'intermediate', micSensitivity: 0.5, noiseGate: 0.02, tuningPrecision: 'balanced' },
  results: [],
  completedLessons: [],
};

type SyncStatus = 'local' | 'connected' | 'syncing' | 'error';

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
};

interface StoreContextValue {
  profile: UserProfile;
  addXp: (xp: number) => void;
  recordResult: (result: ExerciseResult) => void;
  completeLesson: (lessonId: string, xp: number) => void;
  unlockBadge: (badgeId: string) => boolean;
  updateRange: (lowest: number, highest: number) => void;
  updateSettings: (patch: Partial<UserProfile['settings']>) => void;
  resetProfile: () => void;
  touchStreak: () => void;
  setDailyChallenge: (challenge: UserProfile['dailyChallenge']) => void;
  exportProfile: () => string;
  importProfile: (json: string) => boolean;
  storageWarning: string | null;
  melodies: SavedMelody[];
  saveMelody: (name: string, notes: Note[], durationMs: number) => SavedMelody;
  deleteMelody: (id: string) => void;
  renameMelody: (id: string, name: string) => void;
  syncStatus: SyncStatus;
  syncMessage: string | null;
  connectSupabase: () => Promise<boolean>;
  disconnectSupabase: () => void;
  forceSyncToSupabase: () => Promise<boolean>;
  // ── Monetização / entitlements ──
  subscription: Subscription | null;
  isPro: boolean;
  isTeacher: boolean;
  authUser: { id: string; email?: string | null } | null;
  upgradeOpen: boolean;
  upgradeDefaultPlan: PlanId | null;
  openUpgrade: (plan?: PlanId) => void;
  closeUpgrade: () => void;
  refreshSubscription: () => Promise<void>;
  canAccessView: (view: View) => boolean;
  canAccessCourse: (courseId: string) => boolean;
  canAccessExercise: (exerciseId: string) => boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed, settings: { ...DEFAULT_PROFILE.settings, ...parsed.settings } };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function saveProfile(p: UserProfile): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    return true;
  } catch (e) {
    console.error('Failed to save profile', e);
    return false;
  }
}

function loadMelodies(): SavedMelody[] {
  try {
    const raw = localStorage.getItem(MELODIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMelodiesLib(list: SavedMelody[]): boolean {
  try {
    localStorage.setItem(MELODIES_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error('Failed to save melody library', e);
    return false;
  }
}

function loadSyncEnabled(): boolean {
  try {
    return localStorage.getItem(SYNC_KEY) === '1';
  } catch {
    return false;
  }
}

function saveSyncEnabled(value: boolean) {
  try {
    localStorage.setItem(SYNC_KEY, value ? '1' : '0');
  } catch {}
}

function ensureSupabaseShape(profile: UserProfile, melodies: SavedMelody[]) {
  return {
    profile,
    melodies,
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [melodies, setMelodies] = useState<SavedMelody[]>(() => loadMelodies());
  const [profileSaveFailed, setProfileSaveFailed] = useState(false);
  const [melodiesSaveFailed, setMelodiesSaveFailed] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(loadSyncEnabled() ? 'connected' : 'local');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null>(null);
  const [syncEnabled, setSyncEnabled] = useState<boolean>(loadSyncEnabled());
  const supabase = getSupabaseClient();

  // ── Entitlements / monetização state ──
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeDefaultPlan, setUpgradeDefaultPlan] = useState<PlanId | null>(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const authUser = supabaseUser;

  // ── Teacher emails that bypass paywall (hardcoded for quick setup) ──
  const TEACHER_EMAILS = ['amandix.maria@gmail.com', 'slnorego@gmail.com'];
  const isTeacherByEmail = authUser?.email ? TEACHER_EMAILS.includes(authUser.email) : false;
  const isTeacherFinal = isTeacher || isTeacherByEmail;
  const isPro = isSubscriptionActive(subscription) || isTeacherFinal;

  const refreshSubscription = useCallback(async () => {
    if (!supabase || !supabaseUser) { setSubscription(null); setIsTeacher(false); return; }
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();
      setSubscription((data as Subscription) ?? null);

      // Check if user is a teacher
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('id', supabaseUser.id)
        .maybeSingle();
      setIsTeacher(!!teacherData);
    } catch (e) {
      console.error('refreshSubscription failed', e);
    }
  }, [supabase, supabaseUser]);

  // Load subscription whenever the auth user changes.
  useEffect(() => { void refreshSubscription(); }, [refreshSubscription]);

  // Revalidate subscription periodically (every 5 min) so expired trials,
  // canceled Asaas subscriptions, and payment webhooks are reflected without a reload.
  // Server (Supabase + RLS) is the source of truth — the client never trusts
  // a stale localStorage snapshot of the entitlement for paid features.
  useEffect(() => {
    if (!supabaseUser) return;
    const id = setInterval(() => { void refreshSubscription(); }, 5 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refreshSubscription(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [supabaseUser, refreshSubscription]);

  const openUpgrade = useCallback((plan?: PlanId) => {
    setUpgradeDefaultPlan(plan ?? null);
    setUpgradeOpen(true);
  }, []);
  const closeUpgrade = useCallback(() => setUpgradeOpen(false), []);

  const canAccessView = useCallback((view: View) => {
    if (isTeacherFinal) return true;
    return entCanAccessView(view, subscription);
  }, [isTeacherFinal, subscription]);
  const canAccessCourse = useCallback((courseId: string) => {
    if (isTeacherFinal) return true;
    return entCanAccessCourse(courseId, subscription);
  }, [isTeacherFinal, subscription]);
  const canAccessExercise = useCallback((exerciseId: string) => {
    if (isTeacherFinal) return true;
    return entCanAccessExercise(exerciseId, subscription);
  }, [isTeacherFinal, subscription]);

  // ── Rate limiting for auth attempts (max 5 per 10 min per email) ──
  const authAttempts = useRef<Map<string, number[]>>(new Map());

  const checkRateLimit = useCallback((email: string): boolean => {
    const now = Date.now();
    const window = 10 * 60 * 1000; // 10 minutes
    const maxAttempts = 5;
    const attempts = authAttempts.current.get(email) || [];
    const recent = attempts.filter(t => now - t < window);
    if (recent.length >= maxAttempts) return false;
    recent.push(now);
    authAttempts.current.set(email, recent);
    return true;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return { ok: false, error: 'Backend não configurado.' };
    if (!checkRateLimit(email)) return { ok: false, error: 'Muitas tentativas. Aguarde 10 minutos.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, [supabase, checkRateLimit]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return { ok: false, error: 'Backend não configurado.' };
    if (!checkRateLimit(email)) return { ok: false, error: 'Muitas tentativas. Aguarde 10 minutos.' };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, error: error.message };
    // Auto-sign-in if signup returned a session (email confirmation disabled).
    if (data.session) {
      setSupabaseUser({ id: data.user!.id, email: data.user!.email });
    }
    return { ok: true };
  }, [supabase, checkRateLimit]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    try { await supabase.auth.signOut(); } catch { /* session may already be invalid */ }
    setSubscription(null);
    setSupabaseUser(null);
    try { localStorage.removeItem('mastersinger:onboarded'); } catch {}
  }, [supabase]);

  useEffect(() => { setProfileSaveFailed(!saveProfile(profile)); }, [profile]);
  useEffect(() => { setMelodiesSaveFailed(!saveMelodiesLib(melodies)); }, [melodies]);

  const storageWarning = profileSaveFailed || melodiesSaveFailed
    ? 'O armazenamento do navegador está cheio e seus dados não estão sendo salvos. Exporte seu perfil e remova melodias antigas para liberar espaço.'
    : null;

  const persistLocalSnapshot = useCallback((nextProfile: UserProfile, nextMelodies: SavedMelody[]) => {
    saveProfile(nextProfile);
    saveMelodiesLib(nextMelodies);
  }, []);

  const syncToSupabase = useCallback(async (nextProfile = profile, nextMelodies = melodies) => {
    if (!supabase || !supabaseUser) return false;
    setSyncStatus('syncing');
    setSyncMessage(null);
    try {
      const payload = ensureSupabaseShape(nextProfile, nextMelodies);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: supabaseUser.id,
          email: supabaseUser.email ?? null,
          profile: payload.profile,
          melodies: payload.melodies,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      if (error) throw error;
      setSyncStatus('connected');
      setSyncMessage('Sincronizado com Supabase.');
      return true;
    } catch (err) {
      console.error('Supabase sync failed', err);
      setSyncStatus('error');
      setSyncMessage('Falha ao sincronizar com Supabase.');
      return false;
    }
  }, [melodies, profile, supabase, supabaseUser]);

  const hydrateFromSupabase = useCallback(async () => {
    if (!supabase || !supabaseUser) return false;
    try {
      setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('profiles')
        .select('profile, melodies')
        .eq('id', supabaseUser.id)
        .maybeSingle();
      if (error) throw error;
      if (data?.profile) {
        setProfile({ ...DEFAULT_PROFILE, ...data.profile, settings: { ...DEFAULT_PROFILE.settings, ...(data.profile.settings ?? {}) } });
      }
      if (Array.isArray(data?.melodies)) {
        setMelodies(data.melodies);
      }
      setSyncStatus('connected');
      setSyncMessage('Dados carregados do Supabase.');
      return true;
    } catch (err) {
      console.error('Supabase hydrate failed', err);
      setSyncStatus('error');
      setSyncMessage('Não foi possível carregar do Supabase.');
      return false;
    }
  }, [supabase, supabaseUser]);

  // Keep a ref to the latest hydrateFromSupabase so the auth useEffect
  // doesn't need it as a dependency (which would cause infinite re-renders).
  const hydrateRef = useRef(hydrateFromSupabase);
  hydrateRef.current = hydrateFromSupabase;

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;

    // Supabase client is created with detectSessionInUrl:true, which
    // automatically processes ?code= (PKCE) or #access_token= (implicit)
    // from the URL on initialization. We do NOT need to call
    // exchangeCodeForSession manually — it would race with the built-in
    // handler and fail (code verifier already consumed).
    //
    // We only need to: (a) read the initial session, (b) listen for auth
    // state changes, and (c) clean up stale URL params.

    if (import.meta.env.DEV) console.log('[Auth] init, hash:', window.location.hash, 'query:', window.location.search || 'none');

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!mounted) return;
      const sessionUser = data.session?.user;
      if (import.meta.env.DEV) console.log('[Auth] getSession result:', sessionUser ? `user=${sessionUser.email}` : 'no session', error?.message ?? '');
      if (error) {
        if (import.meta.env.DEV) console.warn('[Auth] clearing invalid session:', error.message);
        void supabase.auth.signOut({ scope: 'local' });
        try { localStorage.removeItem('mastersinger:onboarded'); } catch {}
        return;
      }
      if (sessionUser) {
        // getSession() returns cached session from localStorage — it might be
        // stale (user deleted on server). Validate against the server.
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          if (import.meta.env.DEV) console.warn('[Auth] session invalid on server, clearing:', userError?.message ?? 'no user');
          void supabase.auth.signOut({ scope: 'local' });
          try { localStorage.removeItem('mastersinger:onboarded'); } catch {}
          return;
        }
        setSupabaseUser({ id: userData.user.id, email: userData.user.email });
        setSyncEnabled(loadSyncEnabled());
        setSyncStatus(loadSyncEnabled() ? 'connected' : 'local');
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (import.meta.env.DEV) console.log('[Auth] onAuthStateChange:', event, session?.user?.email ?? 'no user');
      if (event === 'SIGNED_OUT') {
        setSupabaseUser(null);
        setSubscription(null);
        setSyncEnabled(false);
        saveSyncEnabled(false);
        setSyncStatus('local');
        try { localStorage.removeItem('mastersinger:onboarded'); } catch {}
        return;
      }
      const user = session?.user;
      if (user) {
        setSupabaseUser({ id: user.id, email: user.email });
        const enabled = loadSyncEnabled();
        setSyncEnabled(enabled);
        setSyncStatus(enabled ? 'connected' : 'local');
        saveSyncEnabled(enabled);
        if (enabled) void hydrateRef.current();
        // Clean up any auth tokens from the URL after successful auth
        const h = window.location.hash;
        const q = window.location.search;
        if (h.includes('access_token') || h.includes('refresh_token') || q.includes('code=')) {
          window.history.replaceState(null, '', window.location.pathname + '#app');
        }
      } else {
        setSupabaseUser(null);
        setSyncEnabled(false);
        saveSyncEnabled(false);
        setSyncStatus('local');
        // Clean up stale auth params even when there's no session
        // (e.g. expired PKCE code sitting in the URL)
        const q = window.location.search;
        if (q.includes('code=') || q.includes('state=')) {
          window.history.replaceState(null, '', window.location.pathname + (window.location.hash || ''));
        }
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!syncEnabled) return;
    if (!supabaseUser) return;
    void syncToSupabase(profile, melodies);
  }, [melodies, profile, syncEnabled, syncToSupabase, supabaseUser]);

  const addXp = useCallback((xp: number) => {
    setProfile(prev => {
      let newXp = prev.xp + xp;
      let newLevel = prev.level;
      while (newXp >= xpForLevel(newLevel)) {
        newXp -= xpForLevel(newLevel);
        newLevel++;
      }
      const weekStart = weekStartISO();
      const weeklyXp = [...prev.weeklyXp];
      const weekIdx = weeklyXp.findIndex(w => w.weekStart === weekStart);
      if (weekIdx >= 0) {
        weeklyXp[weekIdx] = { ...weeklyXp[weekIdx], xp: weeklyXp[weekIdx].xp + xp };
      } else {
        weeklyXp.push({ weekStart, xp });
        if (weeklyXp.length > 12) weeklyXp.shift();
      }
      return { ...prev, xp: newXp, level: newLevel, weeklyXp };
    });
  }, []);

  const recordResult = useCallback((result: ExerciseResult) => {
    setProfile(prev => ({
      ...prev,
      results: [result, ...prev.results].slice(0, 200),
    }));
    addXp(result.xpEarned);
  }, [addXp]);

  const completeLesson = useCallback((lessonId: string, xp: number) => {
    setProfile(prev => {
      if (prev.completedLessons.includes(lessonId)) return prev;
      return { ...prev, completedLessons: [...prev.completedLessons, lessonId] };
    });
    addXp(xp);
  }, [addXp]);

  const unlockBadge = useCallback((badgeId: string): boolean => {
    let wasNew = false;
    setProfile(prev => {
      if (prev.badges.includes(badgeId)) return prev;
      wasNew = true;
      return { ...prev, badges: [...prev.badges, badgeId] };
    });
    return wasNew;
  }, []);

  const updateRange = useCallback((lowest: number, highest: number) => {
    setProfile(prev => {
      const newLow = Math.min(prev.range.lowestMidi ?? 127, lowest);
      const newHigh = Math.max(prev.range.highestMidi ?? 0, highest);
      const voiceType = classifyVoiceType(newLow, newHigh);
      const rangeCenterMidi = Math.round((newLow + newHigh) / 2);
      return {
        ...prev,
        range: { lowestMidi: newLow, highestMidi: newHigh, detectedAt: Date.now(), voiceType },
        settings: { ...prev.settings, rangeCenterMidi },
      };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<UserProfile['settings']>) => {
    setProfile(prev => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const touchStreak = useCallback(() => {
    setProfile(prev => {
      const today = todayISO();
      if (prev.streak.lastActiveDate === today) return prev;
      const yesterday = todayISO(new Date(Date.now() - 86400000));
      let newCurrent: number;
      if (prev.streak.lastActiveDate === yesterday) {
        newCurrent = prev.streak.current + 1;
      } else if (prev.streak.lastActiveDate === '' ) {
        newCurrent = 1;
      } else {
        if (prev.streak.freezes > 0) {
          newCurrent = prev.streak.current + 1;
          return {
            ...prev,
            streak: {
              ...prev.streak,
              current: newCurrent,
              longest: Math.max(prev.streak.longest, newCurrent),
              lastActiveDate: today,
              freezes: prev.streak.freezes - 1,
            },
          };
        }
        newCurrent = 1;
      }
      return {
        ...prev,
        streak: {
          ...prev.streak,
          current: newCurrent,
          longest: Math.max(prev.streak.longest, newCurrent),
          lastActiveDate: today,
        },
      };
    });
  }, []);

  const setDailyChallenge = useCallback((challenge: UserProfile['dailyChallenge']) => {
    setProfile(prev => ({ ...prev, dailyChallenge: challenge }));
  }, []);

  const resetProfile = useCallback(() => {
    const next = { ...DEFAULT_PROFILE };
    setProfile(next);
    setMelodies([]);
    persistLocalSnapshot(next, []);
    void syncToSupabase(next, []);
  }, [persistLocalSnapshot, syncToSupabase]);

  const exportProfile = useCallback(() => JSON.stringify(profile, null, 2), [profile]);

  const importProfile = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== 'object' || parsed === null) return false;
      if (typeof parsed.level !== 'number' || typeof parsed.xp !== 'number') return false;
      if (!Array.isArray(parsed.badges)) return false;
      if (!parsed.streak || typeof parsed.streak !== 'object') return false;
      if (!parsed.settings || typeof parsed.settings !== 'object') return false;
      // Cap imported values to prevent cheating
      parsed.level = Math.min(Math.max(1, Math.floor(parsed.level)), 99);
      parsed.xp = Math.min(Math.max(0, Math.floor(parsed.xp)), 100000);
      parsed.badges = parsed.badges.filter((b: unknown) => typeof b === 'string').slice(0, 50);
      const next = { ...DEFAULT_PROFILE, ...parsed, settings: { ...DEFAULT_PROFILE.settings, ...parsed.settings } };
      setProfile(next);
      if (Array.isArray(parsed.melodies)) setMelodies(parsed.melodies);
      persistLocalSnapshot(next, Array.isArray(parsed.melodies) ? parsed.melodies : melodies);
      void syncToSupabase(next, Array.isArray(parsed.melodies) ? parsed.melodies : melodies);
      return true;
    } catch {
      return false;
    }
  }, [melodies, persistLocalSnapshot, syncToSupabase]);

  const saveMelody = useCallback((name: string, notes: Note[], durationMs: number): SavedMelody => {
    const melody: SavedMelody = {
      id: `mel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || (new Date().toLocaleString()),
      notes,
      durationMs,
      noteCount: notes.length,
      createdAt: Date.now(),
    };
    setMelodies(prev => [melody, ...prev].slice(0, 100));
    return melody;
  }, []);

  const deleteMelody = useCallback((id: string) => {
    setMelodies(prev => prev.filter(m => m.id !== id));
  }, []);

  const renameMelody = useCallback((id: string, name: string) => {
    setMelodies(prev => prev.map(m => m.id === id ? { ...m, name: name.trim() || m.name } : m));
  }, []);

  const connectSupabase = useCallback(async () => {
    if (!supabase) {
      setSyncStatus('error');
      setSyncMessage('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return false;
    }
    // Check if already logged in
    if (supabaseUser) {
      setSyncStatus('connected');
      setSyncMessage('Já conectado ao Supabase.');
      return true;
    }
    // For sync purposes, use the existing auth state from the upgrade modal
    // The user should be logged in via the UpgradeModal before connecting sync
    setSyncStatus('error');
    setSyncMessage('Faça login no app primeiro (via botão Pro) para conectar a sincronização.');
    return false;
  }, [supabase, supabaseUser]);

  const disconnectSupabase = useCallback(() => {
    setSupabaseUser(null);
    setSyncEnabled(false);
    saveSyncEnabled(false);
    setSyncStatus('local');
    setSyncMessage('Sincronização desligada.');
  }, []);

  const forceSyncToSupabase = useCallback(async () => {
    return syncToSupabase(profile, melodies);
  }, [melodies, profile, syncToSupabase]);

  return (
    <StoreContext.Provider value={{
      profile,
      addXp,
      recordResult,
      completeLesson,
      unlockBadge,
      updateRange,
      updateSettings,
      resetProfile,
      touchStreak,
      setDailyChallenge,
      exportProfile,
      importProfile,
      storageWarning,
      melodies,
      saveMelody,
      deleteMelody,
      renameMelody,
      syncStatus,
      syncMessage,
      connectSupabase,
      disconnectSupabase,
      forceSyncToSupabase,
      // ── Monetização / entitlements ──
      subscription,
      isPro,
      isTeacher: isTeacherFinal,
      authUser,
      upgradeOpen,
      upgradeDefaultPlan,
      openUpgrade,
      closeUpgrade,
      canAccessView,
      canAccessCourse,
      canAccessExercise,
      refreshSubscription,
      signIn,
      signUp,
      signOut,
    }}>
      {storageWarning && (
        <div className="fixed top-0 inset-x-0 z-[100] bg-red-600 text-white text-xs font-semibold px-4 py-2 text-center shadow-lg pointer-events-none" role="alert" aria-live="assertive">
          ⚠ {storageWarning}
        </div>
      )}
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// ── Level titles ──
const LEVEL_TITLES = [
  { level: 1,  title: 'Aprendiz' },
  { level: 5,  title: 'Coralista' },
  { level: 12, title: 'Solista' },
  { level: 22, title: 'Vocalista' },
  { level: 35, title: 'Primeira Voz' },
  { level: 50, title: 'Maestro' },
  { level: 75, title: 'Virtuoso' },
  { level: 95, title: 'Lenda' },
];
export function getLevelTitle(level: number): string {
  let title = 'Aprendiz';
  for (const t of LEVEL_TITLES) {
    if (level >= t.level) title = t.title;
  }
  return title;
}

export function getLeague(weeklyXp: number): League {
  if (weeklyXp >= 1500) return 'Diamond';
  if (weeklyXp >= 900) return 'Platinum';
  if (weeklyXp >= 500) return 'Gold';
  if (weeklyXp >= 200) return 'Silver';
  return 'Bronze';
}

export function xpForLevel(level: number): number {
  return Math.floor(50 * level * level + 50 * level);
}