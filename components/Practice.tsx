import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { EXERCISES, getExercisesByType, getExercisesByLevel } from '../data/exercises';
import { scoreExercise } from '../services/scoringService';
import { playNote, playSequence, stopAll, ensureAudioStarted } from '../services/audioService';
import { midiToNoteName, midiToFrequency } from '../services/theoryService';
import type { Exercise, ExerciseType, PitchFrame, ExerciseResult } from '../types';

interface PracticeProps {
  preselectedExerciseIds?: string[];
  isDaily?: boolean;
  onComplete?: () => void;
}

type Phase = 'select' | 'ready' | 'listening' | 'countdown' | 'result';

export function Practice({ preselectedExerciseIds, isDaily, onComplete }: PracticeProps) {
  const { profile, recordResult, touchStreak, unlockBadge } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const userLevel = profile.settings.level;

  const [phase, setPhase] = useState<Phase>('select');
  const [selectedType, setSelectedType] = useState<ExerciseType | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [exerciseQueue, setExerciseQueue] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<Omit<ExerciseResult, 'exerciseId' | 'completedAt'> | null>(null);
  const [allResults, setAllResults] = useState<ExerciseResult[]>([]);
  const [recordedFrames, setRecordedFrames] = useState<PitchFrame[]>([]);
  const [liveCents, setLiveCents] = useState<number>(0);
  const [liveNote, setLiveNote] = useState<string>('');
  const [currentTargetIdx, setCurrentTargetIdx] = useState<number>(-1);

  const framesRef = useRef<PitchFrame[]>([]);
  const exerciseStartRef = useRef<number>(0);
  const targetTimersRef = useRef<number[]>([]);

  const pitch = usePitchDetection({
    a4,
    onFrame: (frame) => {
      framesRef.current.push(frame);
      if (frame.frequency > 0) {
        setLiveCents(frame.cents);
        setLiveNote(frame.noteName);
      }
    },
  });

  // Initialize queue from preselected (daily challenge) or filter by type
  useEffect(() => {
    if (preselectedExerciseIds && preselectedExerciseIds.length > 0) {
      const queue = preselectedExerciseIds
        .map(id => EXERCISES.find(e => e.id === id))
        .filter(Boolean) as Exercise[];
      setExerciseQueue(queue);
      if (queue.length > 0) {
        setCurrentExercise(queue[0]);
        setCurrentIdx(0);
        setPhase('ready');
      }
    }
  }, [preselectedExerciseIds]);

  const handleStartExercise = useCallback(async () => {
    if (!currentExercise) return;
    await ensureAudioStarted();
    setPhase('countdown');
    setCountdown(3);

    const tick = () => {
      setCountdown(c => {
        if (c <= 1) {
          beginExercise();
          return 0;
        }
        return c - 1;
      });
    };
    const interval = window.setInterval(tick, 800);
    targetTimersRef.current.push(interval as unknown as number);
  }, [currentExercise]);

  const beginExercise = useCallback(() => {
    if (!currentExercise) return;
    framesRef.current = [];
    setRecordedFrames([]);
    exerciseStartRef.current = performance.now();
    setPhase('listening');

    // play the exercise target sequence as a guide
    const totalDuration = currentExercise.targets[currentExercise.targets.length - 1].startMs + currentExercise.targets[currentExercise.targets.length - 1].durationMs;
    currentExercise.targets.forEach((target, i) => {
      const t1 = window.setTimeout(() => setCurrentTargetIdx(i), target.startMs);
      const t2 = window.setTimeout(() => playNote(target.midi, target.durationMs * 0.7, 0, a4), target.startMs);
      targetTimersRef.current.push(t1, t2);
    });

    // start mic
    pitch.start();

    // end exercise
    const endT = window.setTimeout(() => {
      endExercise();
    }, totalDuration + 500);
    targetTimersRef.current.push(endT);
  }, [currentExercise]);

  const endExercise = useCallback(() => {
    pitch.stop();
    if (targetTimersRef.current.length) {
      targetTimersRef.current.forEach(t => clearTimeout(t));
      targetTimersRef.current = [];
    }
    if (!currentExercise) return;
    const frames = framesRef.current;
    setRecordedFrames(frames);
    const score = scoreExercise(currentExercise, frames, a4);
    setResult(score);
    setPhase('result');

    const exResult: ExerciseResult = {
      exerciseId: currentExercise.id,
      ...score,
      completedAt: Date.now(),
    };
    recordResult(exResult);
    setAllResults(prev => [...prev, exResult]);
    touchStreak();

    // unlock badges
    if (!profile.badges.includes('first-practice')) unlockBadge('first-practice');
    if (score.score === 100 && !profile.badges.includes('perfect-score')) unlockBadge('perfect-score');
    if (score.accuracyPct >= 95 && !profile.badges.includes('accuracy-95')) unlockBadge('accuracy-95');
    if (profile.streak.current + 1 >= 3 && !profile.badges.includes('streak-3')) unlockBadge('streak-3');
    if (profile.streak.current + 1 >= 7 && !profile.badges.includes('streak-7')) unlockBadge('streak-7');
    if (profile.streak.current + 1 >= 30 && !profile.badges.includes('streak-30')) unlockBadge('streak-30');
  }, [currentExercise, pitch, a4, profile, recordResult, touchStreak, unlockBadge]);

  useEffect(() => {
    return () => {
      pitch.stop();
      if (targetTimersRef.current.length) {
        targetTimersRef.current.forEach(t => clearTimeout(t));
      }
    };
  }, []);

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
              onClick={() => { setSelectedType(type); setPhase('ready'); setCurrentExercise(getExercisesByType(type)[0] ?? null); }}
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

        {/* Suggested for level */}
        <div className="space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            {lang === 'pt-BR' ? 'Sugerido para o seu nível' : 'Suggested for your level'}
          </div>
          <div className="grid gap-2">
            {getExercisesByLevel(userLevel).slice(0, 6).map(ex => (
              <button
                key={ex.id}
                onClick={() => { setSelectedType(ex.type); setCurrentExercise(ex); setPhase('ready'); }}
                className="card p-3 text-left hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono uppercase">{ex.type.split('-')[0]}</span>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{ex.title}</div>
                    <div className="text-[11px] text-slate-400">{ex.description}</div>
                  </div>
                  <span className="text-xs text-violet-400 font-mono">+{ex.xp} XP</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Ready phase ──
  if (phase === 'ready' && currentExercise) {
    const isQueue = exerciseQueue.length > 0;
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">{currentExercise.title}</h1>
          <p className="text-slate-400 text-sm">{currentExercise.description}</p>
          {isDaily && (
            <div className="text-xs text-violet-400 mt-1 font-mono">
              {lang === 'pt-BR' ? `Desafio do dia · exercício ${currentIdx + 1} de ${exerciseQueue.length}` : `Daily challenge · exercise ${currentIdx + 1} of ${exerciseQueue.length}`}
            </div>
          )}
        </div>

        {/* Target notes preview */}
        <div className="card p-5 space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            {lang === 'pt-BR' ? 'Notas alvo' : 'Target notes'}
          </div>
          <div className="flex flex-wrap gap-2">
            {currentExercise.targets.map((tg, i) => (
              <div key={i} className="px-3 py-2 bg-white/5 rounded-lg text-center min-w-[3rem]">
                <div className="text-sm font-bold font-mono">{midiToNoteName(tg.midi)}</div>
                <div className="text-[9px] text-slate-500 font-mono">{(tg.durationMs / 1000).toFixed(1)}s</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { ensureAudioStarted(); playSequence(currentExercise.targets.map(t => t.midi), 500); }} className="btn-ghost">
            <i className="fas fa-headphones mr-2"></i>{t(lang, 'practice.listenFirst')}
          </button>
          <button onClick={handleStartExercise} className="btn-primary">
            <i className="fas fa-play mr-2"></i>{t(lang, 'practice.startExercise')}
          </button>
        </div>

        <button onClick={() => { setPhase('select'); setCurrentExercise(null); setExerciseQueue([]); }} className="btn-ghost w-full">
          {t(lang, 'common.back')}
        </button>
      </div>
    );
  }

  // ── Countdown ──
  if (phase === 'countdown') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{lang === 'pt-BR' ? 'Preparar...' : 'Get ready...'}</div>
          <div className="text-9xl font-black neon-text font-mono ring-pop" key={countdown}>{countdown === 0 ? '🎬' : countdown}</div>
        </div>
      </div>
    );
  }

  // ── Listening phase ──
  if (phase === 'listening' && currentExercise) {
    const cents = liveCents;
    const color = Math.abs(cents) < 10 ? 'text-green-400' : Math.abs(cents) < 25 ? 'text-amber-400' : 'text-red-400';
    return (
      <div className="space-y-6 pb-24">
        <div className="card p-6 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'tuner.note')}</span>
            <span className={`text-5xl font-black font-mono ${color} ${liveNote ? 'pulse-soft' : ''}`}>{liveNote || '—'}</span>
          </div>
          <div className="relative h-3 rounded-full gauge-bg overflow-hidden">
            <div className="absolute top-0 bottom-0 w-1 bg-white transition-all duration-75" style={{ left: `${Math.max(0, Math.min(100, ((cents + 50) / 100) * 100))}%`, transform: 'translateX(-50%)' }} />
          </div>
        </div>

        {/* Target notes progression */}
        <div className="card p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-3">
            {lang === 'pt-BR' ? 'Sequência' : 'Sequence'}
          </div>
          <div className="flex flex-wrap gap-2">
            {currentExercise.targets.map((tg, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg text-center min-w-[3rem] transition-all ${i === currentTargetIdx ? 'bg-violet-500/30 border border-violet-400 scale-110' : i < currentTargetIdx ? 'bg-green-500/20 opacity-60' : 'bg-white/5'}`}
              >
                <div className="text-sm font-bold font-mono">{midiToNoteName(tg.midi)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 font-mono">
          {lang === 'pt-BR' ? 'Cante agora! A correção é automática.' : 'Sing now! Auto-correction ends the exercise.'}
        </div>
      </div>
    );
  }

  // ── Result phase ──
  if (phase === 'result' && currentExercise && result) {
    const isLast = isDaily && currentIdx + 1 >= exerciseQueue.length;
    const totalScore = allResults.length > 0 ? Math.round(allResults.reduce((s, r) => s + r.score, 0) / allResults.length) : result.score;
    return (
      <div className="space-y-6 pb-24">
        <div className="card p-8 text-center space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'practice.score')}</div>
          <div className="text-7xl font-black neon-text font-mono ring-pop">{result.score}%</div>
          <div className="text-2xl">{result.score >= 90 ? '🎉' : result.score >= 70 ? '👍' : '💪'}</div>
          <div className="text-sm text-slate-400">+{result.xpEarned} XP</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">{t(lang, 'practice.accuracy')}</div>
            <div className="text-2xl font-black font-mono text-green-400">{result.accuracyPct}%</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">{t(lang, 'practice.timing')}</div>
            <div className="text-2xl font-black font-mono text-violet-400">{result.timingPct}%</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">{t(lang, 'practice.stability')}</div>
            <div className="text-2xl font-black font-mono text-cyan-400">{result.stabilityPct}%</div>
          </div>
        </div>

        {isDaily && exerciseQueue.length > 1 && (
          <div className="card p-4 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">{lang === 'pt-BR' ? 'Média parcial' : 'Partial average'}</div>
            <div className="text-2xl font-black font-mono">{totalScore}%</div>
            <div className="text-xs text-slate-500">{currentIdx + 1} / {exerciseQueue.length}</div>
          </div>
        )}

        <div className="grid gap-3">
          {!isLast && exerciseQueue.length > 0 ? (
            <button onClick={() => {
              const next = exerciseQueue[currentIdx + 1];
              setCurrentExercise(next);
              setCurrentIdx(currentIdx + 1);
              setResult(null);
              setPhase('ready');
            }} className="btn-primary">
              {lang === 'pt-BR' ? 'Próximo exercício' : 'Next exercise'} <i className="fas fa-arrow-right ml-2"></i>
            </button>
          ) : (
            <>
              <button onClick={() => { setResult(null); setPhase('ready'); }} className="btn-primary">
                <i className="fas fa-redo mr-2"></i>{lang === 'pt-BR' ? 'Tentar de novo' : 'Try again'}
              </button>
              <button onClick={() => { onComplete?.(); setPhase('select'); setCurrentExercise(null); setExerciseQueue([]); setAllResults([]); }} className="btn-ghost">
                {t(lang, 'common.back')}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
