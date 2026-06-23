import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { UserProfile, ExerciseResult, StudentLevel, Language, League, SavedMelody, Note } from '../types';
import { todayISO, weekStartISO, classifyVoiceType } from '../services/theoryService';

const STORAGE_KEY = 'mastersinger:v1';
const MELODIES_KEY = 'mastersinger:melodies';

const DEFAULT_PROFILE: UserProfile = {
  level: 1,
  xp: 0,
  badges: [],
  streak: { current: 0, longest: 0, lastActiveDate: '', freezes: 1 },
  weeklyXp: [],
  range: {},
  settings: { language: 'pt-BR', a4: 440, level: 'intermediate' },
  results: [],
  completedLessons: [],
};

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

// XP required to reach next level (scales quadratically)
export function xpForLevel(level: number): number {
  return Math.floor(50 * level * level + 50 * level);
}

export function getLeague(weeklyXp: number): League {
  if (weeklyXp >= 1500) return 'Diamond';
  if (weeklyXp >= 900)  return 'Platinum';
  if (weeklyXp >= 500)  return 'Gold';
  if (weeklyXp >= 200)  return 'Silver';
  return 'Bronze';
}

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
  // ── In-app melody library (save / load / play / delete / export) ──
  melodies: SavedMelody[];
  saveMelody: (name: string, notes: Note[], durationMs: number) => SavedMelody;
  deleteMelody: (id: string) => void;
  renameMelody: (id: string, name: string) => void;
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

// ── Melody library lives in its own localStorage key so a large library
//    never bloats (or overflows) the profile JSON. ──
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [melodies, setMelodies] = useState<SavedMelody[]>(() => loadMelodies());

  // ── Storage-failure surfacing (Fix 8): localStorage.setItem throws
  //    silently (QuotaExceeded) when storage is full, so progress/melodies
  //    vanished with no signal. Track each save's success and show a fixed
  //    banner when either fails so the user can export + clean up. ──
  const [profileSaveFailed, setProfileSaveFailed] = useState(false);
  const [melodiesSaveFailed, setMelodiesSaveFailed] = useState(false);

  useEffect(() => { setProfileSaveFailed(!saveProfile(profile)); }, [profile]);
  useEffect(() => { setMelodiesSaveFailed(!saveMelodiesLib(melodies)); }, [melodies]);

  const storageWarning = profileSaveFailed || melodiesSaveFailed
    ? 'O armazenamento do navegador está cheio e seus dados não estão sendo salvos. Exporte seu perfil e remova melodias antigas para liberar espaço.'
    : null;

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
    let unlocked = false;
    setProfile(prev => {
      if (prev.badges.includes(badgeId)) return prev;
      unlocked = true;
      return { ...prev, badges: [...prev.badges, badgeId] };
    });
    return unlocked;
  }, []);

  const updateRange = useCallback((lowest: number, highest: number) => {
    setProfile(prev => {
      const newLow = Math.min(prev.range.lowestMidi ?? 127, lowest);
      const newHigh = Math.max(prev.range.highestMidi ?? 0, highest);
      // Derive the voice type from the detected floor + midpoint, and the
      // range center the practice/ear-training engines transpose to. These
      // were defined in the type but never computed — so voice classification
      // and range-aware exercises were dead features until now.
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
        // missed days — check if freeze available
        if (prev.streak.freezes > 0) {
          // consume one freeze, keep streak
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
    setProfile({ ...DEFAULT_PROFILE });
  }, []);

  const exportProfile = useCallback(() => JSON.stringify(profile, null, 2), [profile]);

  const importProfile = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      // Fix 9: validate essential fields before applying — a malformed or
      // foreign JSON used to be spread straight into the profile and could
      // crash later renders (e.g. level/xp as strings, streak as null).
      if (typeof parsed !== 'object' || parsed === null) return false;
      if (typeof parsed.level !== 'number' || typeof parsed.xp !== 'number') return false;
      if (!Array.isArray(parsed.badges)) return false;
      if (!parsed.streak || typeof parsed.streak !== 'object') return false;
      if (!parsed.settings || typeof parsed.settings !== 'object') return false;
      setProfile({ ...DEFAULT_PROFILE, ...parsed, settings: { ...DEFAULT_PROFILE.settings, ...parsed.settings } });
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── Melody library CRUD ──
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
