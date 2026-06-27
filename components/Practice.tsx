import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { EXERCISES, getExercisesByType, getExercisesByLevel } from '../data/exercises';
import { scoreExercise } from '../services/scoringService';
import { playNote, stopAll, ensureAudioStarted, playScale } from '../services/audioService';
import { midiToNoteName, transposeExercise, centerOfMidis, transposeOffset } from '../services/theoryService';
import { PitchMeter } from './PitchMeter';
import type { Exercise, ExerciseType, PitchFrame, ExerciseResult } from '../types';

interface PracticeProps {
  preselectedExerciseIds?: string[];
  isDaily?: boolean;
  onComplete?: () => void;
}

type Phase = 'select' | 'ready' | 'countdown' | 'listening' | 'result';
type NoteResult = 'hit' | 'miss' | 'skip' | 'pending';

// How many consecutive voiced frames within tolerance to count as "hit"
const HIT_STREAK_NEEDED = 8; // ~500ms of sustained singing on target
// Max cents deviation to count as on-target — adaptive to the student's level
// so the bar actually rises as they improve. 40 cents (old fixed value) is
// almost a quarter-tone: fine for a beginner finding the note, far too loose
// for a tool a teacher would trust with an advanced singer.
const CENTS_TOLERANCE_BY_LEVEL: Record<string, number> = {
  beginner: 45,      // generous — reward getting close
  intermediate: 32,  // must be clearly in the right pitch zone
  advanced: 22,      // near-professional: ±22 cents or it doesn't count
};

export function Practice({ preselectedExerciseIds, isDaily, onComplete }: PracticeProps) {
  const { profile, recordResult, touchStreak, unlockBadge, canAccessExercise, openUpgrade } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const userLevel = profile.settings.level;
  const rangeCenterMidi = profile.settings.rangeCenterMidi;
  const micSensitivity = profile.settings.micSensitivity ?? 0.5;
  const noiseGate = profile.settings.noiseGate ?? 0.02;
  const centsTolerance = CENTS_TOLERANCE_BY_LEVEL[userLevel] ?? 32;

  const profileRef = useRef(profile);
  profileRef.current = profile;

  const fitExercise = useCallback((ex: Exercise): Exercise => {
    if (!rangeCenterMidi || ex.targets.length === 0) return ex;
    const offset = transposeOffset(centerOfMidis(ex.targets.map(t => t.midi)), rangeCenterMidi);
    return transposeExercise(ex, offset);
  }, [rangeCenterMidi]);

  const [phase, setPhase] = useState<Phase>('select');
  const [selectedType, setSelectedType] = useState<ExerciseType | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [exerciseQueue, setExerciseQueue] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<Omit<ExerciseResult, 'exerciseId' | 'completedAt'> | null>(null);
  const [allResults, setAllResults] = useState<ExerciseResult[]>([]);
  const [playGuide, setPlayGuide] = useState(false);

  // ── Note-by-note state ──
  const [currentNoteIdx, setCurrentNoteIdx] = useState(0);
  const [noteResults, setNoteResults] = useState<NoteResult[]>([]);
  const [noteCents, setNoteCents] = useState(0);
  const [hitFlash, setHitFlash] = useState<'hit' | 'miss' | null>(null);

  const framesRef = useRef<PitchFrame[]>([]);
  const noteTimersRef = useRef<number[]>([]);
  const endedRef = useRef<boolean>(false);
  const currentExerciseRef = useRef<Exercise | null>(currentExercise);
  const phaseRef = useRef<Phase>(phase);
  const beginRef = useRef<() => void>(() => {});
  const playGuideRef = useRef<boolean>(playGuide);
  const currentNoteIdxRef = useRef(0);
  const hitStreakRef = useRef(0);
  const noteStartTimeRef = useRef(0);
  // Track real timestamps for scoring — relative to pitch start
  const noteRealStartRef = useRef<number[]>([]);
  const exerciseStartRef = useRef(0);
  // Ref for noteResults to avoid stale closures in endExercise
  const noteResultsRef = useRef<NoteResult[]>([]);
  // Track real cents deviation per note during the streak
  const noteCentsRef = useRef<number[][]>([]);
  const endExerciseRef = useRef<() => void>(() => {});

  useEffect(() => { currentExerciseRef.current = currentExercise; }, [currentExercise]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { playGuideRef.current = playGuide; }, [playGuide]);
  useEffect(() => { currentNoteIdxRef.current = currentNoteIdx; }, [currentNoteIdx]);
  useEffect(() => { noteResultsRef.current = noteResults; }, [noteResults]);

  const pitch = usePitchDetection({
    a4,
    record: true,
    micSensitivity,
    noiseGate,
    onFrame: (frame) => {
      if (phaseRef.current !== 'listening') return;
      framesRef.current.push(frame);

      const ex = currentExerciseRef.current;
      if (!ex) return;
      const idx = currentNoteIdxRef.current;
      if (idx >= ex.targets.length) return;

      const target = ex.targets[idx];

      if (frame.frequency > 0 && frame.confidence > 0.25) {
        // Check if on-target using cents deviation from target midi
        const centsDeviation = Math.abs((frame.midi - target.midi) * 100);
        setNoteCents(Math.round((frame.midi - target.midi) * 100));

        // Fold the deviation onto the nearest octave so singing the right note
        // in the wrong octave still counts, but a tritone/wrong note never does.
        // Then gate on the LEVEL-ADAPTIVE tolerance — the old code's
        // `round(detected) === round(target)` shortcut meant the real tolerance
        // was always ±50 cents (a full half-step), so the configured value did
        // nothing. Now ±tolerance actually bites: 45/32/22 by level.
        const octDist = centsDeviation % 1200;
        const foldedDev = Math.min(octDist, 1200 - octDist);
        const onTarget = foldedDev < centsTolerance;

        if (onTarget) {
          hitStreakRef.current++;
          // Accumulate cents for this note's median
          if (!noteCentsRef.current[idx]) noteCentsRef.current[idx] = [];
          noteCentsRef.current[idx].push(Math.round((frame.midi - target.midi) * 100));
        } else {
          hitStreakRef.current = 0;
        }

        // Hit confirmed after N consecutive good frames
        if (hitStreakRef.current >= HIT_STREAK_NEEDED) {
          advanceNote('hit');
        }
      } else {
        hitStreakRef.current = 0;
      }
    },
  });

  const clearAllTimers = () => {
    noteTimersRef.current.forEach(id => clearTimeout(id));
    noteTimersRef.current = [];
  };

  const advanceNote = useCallback((result: NoteResult) => {
    clearAllTimers();
    hitStreakRef.current = 0;

    const ex = currentExerciseRef.current;
    if (!ex) return;
    const idx = currentNoteIdxRef.current;

    // Record result (update ref first, then state)
    const nextResults = [...noteResultsRef.current];
    nextResults[idx] = result;
    noteResultsRef.current = nextResults;
    setNoteResults(nextResults);

    // Flash feedback
    setHitFlash(result === 'hit' ? 'hit' : 'miss');
    const flashId = window.setTimeout(() => setHitFlash(null), 400);
    noteTimersRef.current.push(flashId);

    const nextIdx = idx + 1;
    if (nextIdx >= ex.targets.length) {
      // Exercise complete
      const endId = window.setTimeout(() => endExerciseRef.current(), 600);
      noteTimersRef.current.push(endId);
      return;
    }

    // Advance to next note
    setCurrentNoteIdx(nextIdx);
    currentNoteIdxRef.current = nextIdx;
    noteStartTimeRef.current = performance.now();
    noteRealStartRef.current[nextIdx] = performance.now() - exerciseStartRef.current;
  }, [a4]);

  const endExercise = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    pitch.stop();
    clearAllTimers();
    stopAll();

    const ex = currentExerciseRef.current;
    if (!ex) return;

    // Use ref to avoid stale closure on noteResults
    const currentNoteResults = noteResultsRef.current;

    // Build synthetic frames for scoring based on note results + real timestamps
    const syntheticFrames: PitchFrame[] = [];
    ex.targets.forEach((target, i) => {
      const res = currentNoteResults[i] ?? 'miss';
      const start = noteRealStartRef.current[i] ?? 0;
      if (res === 'hit') {
        // Use median of real cents collected during streak, or 0 if none
        const centsHistory = noteCentsRef.current[i] ?? [];
        const sortedCents = [...centsHistory].sort((a, b) => a - b);
        const mid = Math.floor(sortedCents.length / 2);
        const realCents = sortedCents.length > 0
          ? (sortedCents.length % 2 ? sortedCents[mid] : (sortedCents[mid - 1] + sortedCents[mid]) / 2)
          : 0;
        const realMidi = target.midi + realCents / 100;
        const realFreq = target.midi > 0 ? 440 * Math.pow(2, (realMidi - 69) / 12) : 0;
        for (let j = 0; j < 10; j++) {
          syntheticFrames.push({
            frequency: realFreq,
            confidence: 0.8,
            cents: realCents,
            midi: realMidi,
            noteName: midiToNoteName(Math.round(target.midi)),
            octave: Math.floor(target.midi / 12) - 1,
            timestamp: start + j * 16,
          });
        }
      }
    });

    // Also use raw frames for stability/timing analysis
    const allFrames = [...syntheticFrames, ...framesRef.current];
    const score = scoreExercise(ex, allFrames, a4);
    setResult(score);
    setPhase('result');

    const exResult: ExerciseResult = {
      exerciseId: ex.id,
      ...score,
      completedAt: Date.now(),
    };
    recordResult(exResult);
    setAllResults(prev => [...prev, exResult]);
    touchStreak();

    const p = profileRef.current;
    if (!p.badges.includes('first-practice')) unlockBadge('first-practice');
    if (score.score === 100 && !p.badges.includes('perfect-score')) unlockBadge('perfect-score');
    if (score.accuracyPct >= 95 && !p.badges.includes('accuracy-95')) unlockBadge('accuracy-95');
    const newStreak = p.streak.current + 1;
    if (newStreak >= 3 && !p.badges.includes('streak-3')) unlockBadge('streak-3');
    if (newStreak >= 7 && !p.badges.includes('streak-7')) unlockBadge('streak-7');
    if (newStreak >= 30 && !p.badges.includes('streak-30')) unlockBadge('streak-30');
  }, [a4, pitch, recordResult, touchStreak, unlockBadge]);
  endExerciseRef.current = endExercise;

  // ── Daily-challenge queue init ──
  useEffect(() => {
    if (preselectedExerciseIds && preselectedExerciseIds.length > 0) {
      const queue = preselectedExerciseIds
        .map(id => EXERCISES.find(e => e.id === id))
        .filter(Boolean) as Exercise[];
      setExerciseQueue(queue);
      if (queue.length > 0) {
        setCurrentExercise(fitExercise(queue[0]));
        setCurrentIdx(0);
        setPhase('ready');
      }
    }
  }, [preselectedExerciseIds]);

  // ── Countdown ──
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      beginRef.current();
      return;
    }
    const id = window.setTimeout(() => setCountdown(c => c - 1), 800);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  // ── Begin exercise ──
  const beginExercise = async () => {
    const ex = currentExerciseRef.current;
    if (!ex || ex.targets.length === 0) return;
    clearAllTimers();
    endedRef.current = false;
    framesRef.current = [];
    setNoteCents(0);
    setHitFlash(null);
    setCurrentNoteIdx(0);
    currentNoteIdxRef.current = 0;
    hitStreakRef.current = 0;
    noteStartTimeRef.current = performance.now();
    setNoteResults(new Array(ex.targets.length).fill('pending'));
    noteCentsRef.current = [];
    setPhase('listening');

    // NO audio during exercise — user listens before starting or uses headphones
    // The playGuide toggle is ignored during singing to prevent mic bleed

    try {
      await pitch.start();
    } catch {
      // mic permission denied or hardware error — stay in listening phase
      // the hook's pitch.error will surface the problem
      return;
    }
    exerciseStartRef.current = performance.now();
    noteRealStartRef.current = new Array(ex.targets.length).fill(0);
    noteRealStartRef.current[0] = 0;
  };
  beginRef.current = beginExercise;

  const handleStart = async () => {
    if (!currentExercise) return;
    await ensureAudioStarted();
    clearAllTimers();
    endedRef.current = false;
    setCountdown(3);
    setPhase('countdown');
  };

  const handleListenFirst = async () => {
    if (!currentExercise) return;
    clearAllTimers();
    stopAll();
    await ensureAudioStarted();
    const midis = currentExercise.targets.map(t => t.midi);
    const beatMs = currentExercise.tempoBpm ? 60000 / currentExercise.tempoBpm : 800;
    playScale(midis, beatMs, a4);
  };

  const handleStop = () => {
    clearAllTimers();
    endExercise();
  };

  const handleSkipNote = () => {
    advanceNote('skip');
  };

  const resetToSelect = () => {
    clearAllTimers();
    pitch.stop();
    stopAll();
    setResult(null);
    setPhase('select');
    setCurrentExercise(null);
    setExerciseQueue([]);
    setAllResults([]);
    setNoteResults([]);
    noteResultsRef.current = [];
    noteCentsRef.current = [];
    endedRef.current = false;
  };

  const tryAgain = () => {
    clearAllTimers();
    pitch.stop();
    stopAll();
    setResult(null);
    setNoteResults([]);
    noteResultsRef.current = [];
    noteCentsRef.current = [];
    endedRef.current = false;
    setPhase('ready');
  };

  const goNext = () => {
    const next = exerciseQueue[currentIdx + 1];
    if (!next) return;
    clearAllTimers();
    pitch.stop();
    stopAll();
    setCurrentExercise(fitExercise(next));
    setCurrentIdx(currentIdx + 1);
    setResult(null);
    setNoteResults([]);
    noteResultsRef.current = [];
    noteCentsRef.current = [];
    endedRef.current = false;
    setPhase('ready');
  };

  useEffect(() => {
    return () => {
      clearAllTimers();
      pitch.stop();
      stopAll();
    };
  }, []);

  const L = (pt: string, en: string) => (lang === 'pt-BR' ? pt : en);

  // ── Select phase ──
  if (phase === 'select') {
    const types: { type: ExerciseType; icon: string; titleKey: string; descKey: string }[] = [
      { type: 'scale-runner',   icon: '🪜', titleKey: 'practice.scaleRunner',   descKey: 'practice.scaleRunner.desc' },
      { type: 'arpeggio-drill', icon: '🎼', titleKey: 'practice.arpeggioDrill', descKey: 'practice.arpeggioDrill.desc' },
      { type: 'interval-leap',  icon: '📏', titleKey: 'practice.intervalLeap',  descKey: 'practice.intervalLeap.desc' },
      { type: 'pitch-hold',     icon: '🎯', titleKey: 'practice.pitchHold',     descKey: 'practice.pitchHold.desc' },
    ];
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'practice.title')}</h1>
          <p className="text-slate-400 text-sm">{t(lang, 'practice.subtitle')}</p>
        </div>
        <div className="grid gap-3">
          {types.map(({ type, icon, titleKey, descKey }) => (
            <button
              key={type}
              onClick={() => {
                const byLevel = getExercisesByType(type).filter(e => e.level === userLevel);
                const pool = byLevel.length > 0 ? byLevel : getExercisesByType(type);
                if (pool.length > 0) {
                  // Store RAW exercises in the queue; fitExercise is applied at
                  // display time here and in goNext (applying it to the queue too
                  // would double-transpose).
                  setSelectedType(type);
                  setExerciseQueue(pool);
                  setCurrentIdx(0);
                  setCurrentExercise(fitExercise(pool[0]));
                  setPhase('ready');
                }
              }}
              className="card p-5 text-left hover:border-violet-500/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{icon}</span>
                <div className="flex-1">
                  <div className="text-base font-bold">{t(lang, titleKey)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t(lang, descKey)}</div>
                </div>
                <span className="text-violet-400"><i className="fas fa-chevron-right"></i></span>
              </div>
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{L('Sugerido para o seu nível', 'Suggested for your level')}</div>
          <div className="grid gap-2">
            {getExercisesByLevel(userLevel).map(ex => {
              const locked = !canAccessExercise(ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => {
                    if (locked) return openUpgrade();
                    // RAW pool in the queue; fit only the displayed exercise.
                    const pool = getExercisesByLevel(userLevel).filter(e => e.type === ex.type);
                    const idx = pool.findIndex(e => e.id === ex.id);
                    setSelectedType(ex.type);
                    setExerciseQueue(pool);
                    setCurrentIdx(Math.max(0, idx));
                    setCurrentExercise(fitExercise(ex));
                    setPhase('ready');
                  }}
                  className={`card p-3 text-left hover:border-white/20 transition-all ${locked ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-mono uppercase">{ex.type.split('-')[0]}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold flex items-center gap-2">
                        {locked && <span>🔒</span>}
                        <span>{ex.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">{L(ex.descriptionPt ?? ex.description, ex.description)}</div>
                    </div>
                    <span className="text-xs text-violet-400 font-mono">+{ex.xp} XP</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Ready phase ──
  if (phase === 'ready' && currentExercise) {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">{currentExercise.title}</h1>
          <p className="text-slate-400 text-sm">{L(currentExercise.descriptionPt ?? currentExercise.description, currentExercise.description)}</p>
          {isDaily && <div className="text-xs text-violet-400 mt-1 font-mono">{L(`Desafio do dia · exercício ${currentIdx + 1} de ${exerciseQueue.length}`, `Daily challenge · exercise ${currentIdx + 1} of ${exerciseQueue.length}`)}</div>}
          {rangeCenterMidi != null && <div className="text-xs text-cyan-400 mt-1 font-mono">{L('🎧 Ajustado pra sua tessitura', '🎧 Adjusted to your range')}</div>}
        </div>
        <div className="card p-5 space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{L('Sequência de notas', 'Note sequence')}</div>
          <div className="flex flex-wrap gap-2">
            {currentExercise.targets.map((tg, i) => (
              <div key={i} className="px-3 py-2 bg-white/5 rounded-lg text-center min-w-[3rem]">
                <div className="text-sm font-bold font-mono">{midiToNoteName(tg.midi)}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-slate-500">{L('Cante cada nota — avança quando acertar. Pule se quiser.', 'Sing each note — advances when you hit it. Skip if you want.')}</div>
        </div>
        <button onClick={() => setPlayGuide(g => !g)} className={`card p-4 w-full text-left flex items-center gap-3 transition-all ${playGuide ? 'border-cyan-500/40' : ''}`}>
          <span className="text-xl">{playGuide ? '🔊' : '🔇'}</span>
          <div className="flex-1">
            <div className="text-sm font-bold">{L('Guia sonoro (use fone!)', 'Audio guide (use headphones!)')}</div>
            <div className="text-[11px] text-slate-400">{playGuide ? L('USE FONE senão o microfone pega o som e confunde a detecção.', 'USE HEADPHONES or the mic will pick up the guide and confuse detection.') : L('Desligado — ouça antes de iniciar pra decorar as notas.', 'Off — listen before starting to learn the notes.')}</div>
          </div>
          <span className={`text-xs font-mono ${playGuide ? 'text-cyan-400' : 'text-slate-500'}`}>{playGuide ? L('LIGADO', 'ON') : L('DESLIGADO', 'OFF')}</span>
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleListenFirst} className="btn-ghost"><i className="fas fa-headphones mr-2"></i>{t(lang, 'practice.listenFirst')}</button>
          <button onClick={handleStart} className="btn-primary"><i className="fas fa-play mr-2"></i>{t(lang, 'practice.startExercise')}</button>
        </div>
        <button onClick={resetToSelect} className="btn-ghost w-full">{t(lang, 'common.back')}</button>
      </div>
    );
  }

  // ── Countdown ──
  if (phase === 'countdown') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{L('Preparar...', 'Get ready...')}</div>
          <div className="text-9xl font-black neon-text font-mono ring-pop" key={countdown}>{countdown === 0 ? '🎬' : countdown}</div>
        </div>
      </div>
    );
  }

  // ── Listening phase (note-by-note) ──
  if (phase === 'listening' && currentExercise) {
    const target = currentExercise.targets[currentNoteIdx];
    const totalNotes = currentExercise.targets.length;
    const hitCount = noteResults.filter(r => r === 'hit').length;
    const missCount = noteResults.filter(r => r === 'miss' || r === 'skip').length;

    return (
      <div className="space-y-5 pb-24">
        {/* Current target — big display */}
        <div className={`card p-8 text-center transition-all ${hitFlash === 'hit' ? 'border-green-400/60 bg-green-500/10' : hitFlash === 'miss' ? 'border-red-400/60 bg-red-500/10' : ''}`}>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">
            {L(`Nota ${currentNoteIdx + 1} de ${totalNotes}`, `Note ${currentNoteIdx + 1} of ${totalNotes}`)}
          </div>
          <div className={`text-8xl font-black font-mono transition-colors ${
            hitFlash === 'hit' ? 'text-green-400' : hitFlash === 'miss' ? 'text-red-400' : 'text-white'
          }`}>
            {midiToNoteName(target.midi)}
          </div>
          <div className={`text-2xl font-mono mt-2 transition-colors ${
            hitFlash === 'hit' ? 'text-green-400' : hitFlash === 'miss' ? 'text-red-400' : 'text-slate-400'
          }`}>
            {hitFlash === 'hit' ? '✓ Acertou!' : hitFlash === 'miss' ? '✗ Errou' : noteCents > 0 ? `+${noteCents}ct` : noteCents < 0 ? `${noteCents}ct` : '🎤 Segure a nota...'}
          </div>
        </div>

        {/* Progress dots */}
        <div className="card p-4">
          <div className="flex justify-center gap-2 flex-wrap">
            {currentExercise.targets.map((tg, i) => {
              const res = noteResults[i];
              const isCurrent = i === currentNoteIdx;
              return (
                <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono transition-all ${
                  isCurrent ? 'bg-violet-500 text-white scale-110 ring-2 ring-violet-400/50' :
                  res === 'hit' ? 'bg-green-500/30 text-green-400 border border-green-500/40' :
                  res === 'miss' ? 'bg-red-500/30 text-red-400 border border-red-500/40' :
                  res === 'skip' ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40' :
                  'bg-white/5 text-slate-500 border border-white/10'
                }`}>
                  {res === 'hit' ? '✓' : res === 'miss' ? '✗' : res === 'skip' ? '→' : midiToNoteName(tg.midi).replace(/\d/g, '')}
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-[11px] font-mono">
            <span className="text-green-400">{hitCount} ✓</span>
            <span className="text-red-400">{missCount} ✗</span>
            <span className="text-slate-500">{totalNotes - currentNoteIdx - 1} {L('restantes', 'left')}</span>
          </div>
        </div>

        {/* Pitch meter */}
        <PitchMeter
          frame={pitch.currentFrame}
          targetMidi={target.midi}
          targetLabel={midiToNoteName(target.midi)}
          isListening={pitch.isListening}
          lang={lang}
        />

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleSkipNote} className="btn-ghost">
            <i className="fas fa-forward mr-2"></i>{L('Pular nota', 'Skip note')}
          </button>
          <button onClick={handleStop} className="btn-primary !bg-gradient-to-r !from-red-500 !to-orange-500">
            <i className="fas fa-stop mr-2"></i>{L('Encerrar', 'Stop')}
          </button>
        </div>
      </div>
    );
  }

  // ── Result phase ──
  if (phase === 'result' && currentExercise && result) {
    const hasNext = currentIdx + 1 < exerciseQueue.length;
    const totalScore = allResults.length > 0 ? Math.round(allResults.reduce((s, r) => s + r.score, 0) / allResults.length) : result.score;
    const hitCount = noteResults.filter(r => r === 'hit').length;
    const missedNotes = currentExercise.targets.filter((_, i) => noteResults[i] === 'miss');

    // Coaching hint based on result
    const coachHint = (() => {
      if (result.score >= 90) return L('Excelente! Continue com o próximo exercício.', 'Excellent! Move to the next exercise.');
      if (result.accuracyPct < 60) return L('Foque na afinação: ouça cada nota antes de cantar.', 'Focus on pitch: listen to each note before singing.');
      if (result.stabilityPct < 60) return L('Sustente a nota sem oscilar — apoio de diafragma constante.', 'Sustain without wavering — keep diaphragm support steady.');
      if (hitCount < currentExercise.targets.length / 2) return L('Metade das notas ok. Tente mais devagar.', 'Half the notes ok. Try slower.');
      return L('Bom progresso! Tente de novo para melhorar a estabilidade.', 'Good progress! Try again to improve stability.');
    })();

    return (
      <div className="space-y-5 pb-24">
        <div className="card p-8 text-center space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'practice.score')}</div>
          <div className="text-7xl font-black neon-text font-mono ring-pop">{result.score}%</div>
          <div className="text-2xl">{result.score >= 90 ? '🎉' : result.score >= 70 ? '👍' : '💪'}</div>
          <div className="text-sm text-slate-400">+{result.xpEarned} XP</div>
          <div className="text-xs text-slate-500 font-mono">{hitCount}/{currentExercise.targets.length} {L('notas acertadas', 'notes hit')}</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">{t(lang, 'practice.accuracy')}</div>
            <div className="text-2xl font-black font-mono text-green-400">{result.accuracyPct}%</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">{t(lang, 'practice.timing')}</div>
            <div className="text-2xl font-black font-mono text-violet-400">{result.timingPct}%</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">{t(lang, 'practice.stability')}</div>
            <div className="text-2xl font-black font-mono text-cyan-400">{result.stabilityPct}%</div>
          </div>
        </div>

        {/* Coach feedback */}
        <div className="card p-4 flex gap-3 items-start">
          <span className="text-xl mt-0.5">🎯</span>
          <p className="text-sm text-slate-300 leading-relaxed">{coachHint}</p>
        </div>

        {/* Note-by-note breakdown */}
        <div className="card p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-3">{L('Resultado por nota', 'Note breakdown')}</div>
          <div className="flex flex-wrap gap-2">
            {currentExercise.targets.map((tg, i) => (
              <div key={i} className={`px-3 py-2 rounded-lg text-center min-w-[3rem] ${
                noteResults[i] === 'hit' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                noteResults[i] === 'miss' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                noteResults[i] === 'skip' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-slate-500/20 text-slate-400 border border-slate-500/30'
              }`}>
                <div className="text-sm font-bold font-mono">{midiToNoteName(tg.midi)}</div>
                <div className="text-[9px]">{noteResults[i] === 'hit' ? '✓' : noteResults[i] === 'miss' ? '✗' : noteResults[i] === 'skip' ? '→' : '?'}</div>
              </div>
            ))}
          </div>
          {missedNotes.length > 0 && (
            <div className="text-[10px] text-red-400 font-mono mt-2">
              {L('Praticar: ', 'Focus on: ')}
              {missedNotes.map(tg => midiToNoteName(tg.midi)).join(' · ')}
            </div>
          )}
        </div>

        {pitch.recordingUrl && (
          <div className="card p-5 space-y-3">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{lang === 'pt-BR' ? 'Sua gravação' : 'Your take'}</div>
            <audio controls src={pitch.recordingUrl} className="w-full" />
          </div>
        )}

        {exerciseQueue.length > 1 && (
          <div className="card p-4 text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">
              {isDaily ? L('Progresso', 'Progress') : L('Exercícios no conjunto', 'Exercises in set')}
            </div>
            <div className="text-2xl font-black font-mono">{currentIdx + 1} / {exerciseQueue.length}</div>
            {isDaily && <div className="text-xs text-slate-500 font-mono mt-0.5">{L('Média', 'Avg')} {totalScore}%</div>}
          </div>
        )}

        <div className="grid gap-3">
          {hasNext ? (
            <>
              <button onClick={goNext} className="btn-primary">
                {isDaily ? L('Próximo exercício', 'Next exercise') : L('Próxima variação', 'Next variation')}
                <i className="fas fa-arrow-right ml-2"></i>
              </button>
              <button onClick={tryAgain} className="btn-ghost"><i className="fas fa-redo mr-2"></i>{L('Tentar de novo', 'Try again')}</button>
            </>
          ) : (
            <>
              <button onClick={tryAgain} className="btn-primary"><i className="fas fa-redo mr-2"></i>{L('Tentar de novo', 'Try again')}</button>
              <button onClick={() => { onComplete?.(); resetToSelect(); }} className="btn-ghost">{t(lang, 'common.back')}</button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
