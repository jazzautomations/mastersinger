import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { EXERCISES, getExercisesByType, getExercisesByLevel } from '../data/exercises';
import { scoreExercise } from '../services/scoringService';
import { playNote, stopAll, ensureAudioStarted, beginPlayback, isPlaybackActive } from '../services/audioService';
import { midiToNoteName, transposeExercise, centerOfMidis, transposeOffset } from '../services/theoryService';
import { PitchMeter } from './PitchMeter';
import type { Exercise, ExerciseType, PitchFrame, ExerciseResult } from '../types';

interface PracticeProps {
  preselectedExerciseIds?: string[];
  isDaily?: boolean;
  onComplete?: () => void;
}

type Phase = 'select' | 'ready' | 'countdown' | 'listening' | 'result';

export function Practice({ preselectedExerciseIds, isDaily, onComplete }: PracticeProps) {
  const { profile, recordResult, touchStreak, unlockBadge, canAccessExercise, openUpgrade } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const userLevel = profile.settings.level;
  const rangeCenterMidi = profile.settings.rangeCenterMidi;

  // ── Range-aware transposition: shift each exercise so its pitch center sits
  //    on the singer's detected range center (clamped to ±1.5 octaves). A bass
  //    no longer has to sing a C-major scale pegged at C4, and a soprano isn't
  //    dragged into the cellar. No-op until the range is mapped (Tuner). ──
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
  const [liveCents, setLiveCents] = useState<number>(0);
  const [liveNote, setLiveNote] = useState<string>('');
  const [currentTargetIdx, setCurrentTargetIdx] = useState<number>(-1);
  const [playGuide, setPlayGuide] = useState(false);

  // ── Refs: avoid stale closures + keep timer lifecycles separate ──
  const framesRef = useRef<PitchFrame[]>([]);
  const noteTimersRef = useRef<number[]>([]);
  const endedRef = useRef<boolean>(false);
  const currentExerciseRef = useRef<Exercise | null>(currentExercise);
  const phaseRef = useRef<Phase>(phase);
  const beginRef = useRef<() => void>(() => {});
  const playGuideRef = useRef<boolean>(playGuide);

  useEffect(() => { currentExerciseRef.current = currentExercise; }, [currentExercise]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { playGuideRef.current = playGuide; }, [playGuide]);

  const pitch = usePitchDetection({
    a4,
    record: true,
    onFrame: (frame) => {
      if (phaseRef.current !== 'listening') return;
      framesRef.current.push(frame);
      if (frame.frequency > 0) {
        setLiveCents(frame.cents);
        setLiveNote(frame.noteName);
      }
    },
  });

  const clearAllTimers = () => {
    noteTimersRef.current.forEach(id => clearTimeout(id));
    noteTimersRef.current = [];
  };

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

  // ── Countdown: setTimeout chain, auto-cleaned. No setInterval leak. ──
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      beginRef.current();
      return;
    }
    const id = window.setTimeout(() => setCountdown(c => c - 1), 800);
    return () => clearTimeout(id);
  }, [phase, countdown]);

  // ── Begin (runs once when countdown reaches 0) ──
  const beginExercise = async () => {
    const ex = currentExerciseRef.current;
    if (!ex || ex.targets.length === 0) return;
    clearAllTimers();
    endedRef.current = false;
    framesRef.current = [];
    setLiveCents(0);
    setLiveNote('');
    setCurrentTargetIdx(-1);
    setPhase('listening');

    // visual playhead — always on, no audio bleed
    ex.targets.forEach((target, i) => {
      const id = window.setTimeout(() => setCurrentTargetIdx(i), target.startMs);
      noteTimersRef.current.push(id);
    });

    // audio guide — optional (off by default to avoid mic bleed)
    if (playGuideRef.current) {
      ex.targets.forEach(target => {
        playNote(target.midi, target.durationMs * 0.7, target.startMs, a4);
      });
    }

    await pitch.start();

    const last = ex.targets[ex.targets.length - 1];
    const totalDuration = last.startMs + last.durationMs;
    const endId = window.setTimeout(() => endExercise(), totalDuration + 600);
    noteTimersRef.current.push(endId);
  };
  beginRef.current = beginExercise;

  // ── End + score (idempotent) ──
  const endExercise = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    pitch.stop();
    clearAllTimers();
    stopAll();

    const ex = currentExerciseRef.current;
    if (!ex) return;
    const frames = framesRef.current;
    const score = scoreExercise(ex, frames, a4);
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

    if (!profile.badges.includes('first-practice')) unlockBadge('first-practice');
    if (score.score === 100 && !profile.badges.includes('perfect-score')) unlockBadge('perfect-score');
    if (score.accuracyPct >= 95 && !profile.badges.includes('accuracy-95')) unlockBadge('accuracy-95');
    const newStreak = profile.streak.current + 1;
    if (newStreak >= 3 && !profile.badges.includes('streak-3')) unlockBadge('streak-3');
    if (newStreak >= 7 && !profile.badges.includes('streak-7')) unlockBadge('streak-7');
    if (newStreak >= 30 && !profile.badges.includes('streak-30')) unlockBadge('streak-30');
  };

  // ── Actions ──
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
    currentExercise.targets.forEach(target => {
      playNote(target.midi, target.durationMs * 0.7, target.startMs, a4);
    });
  };

  const handleStop = () => endExercise();

  const resetToSelect = () => {
    clearAllTimers();
    pitch.stop();
    stopAll();
    setResult(null);
    setPhase('select');
    setCurrentExercise(null);
    setExerciseQueue([]);
    setAllResults([]);
  };

  const tryAgain = () => {
    clearAllTimers();
    pitch.stop();
    stopAll();
    setResult(null);
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
    endedRef.current = false;
    setPhase('ready');
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
      pitch.stop();
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              onClick={() => { setSelectedType(type); setCurrentExercise(fitExercise(getExercisesByType(type)[0] ?? null as any)); setPhase('ready'); }}
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
            {getExercisesByLevel(userLevel).slice(0, 6).map(ex => {
              const locked = !canAccessExercise(ex.id);
              return (
                <button
                  key={ex.id}
                  onClick={() => {
                    if (locked) return openUpgrade();
                    setSelectedType(ex.type);
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
                      <div className="text-[11px] text-slate-400">{ex.description}</div>
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
          <p className="text-slate-400 text-sm">{currentExercise.description}</p>
          {isDaily && <div className="text-xs text-violet-400 mt-1 font-mono">{L(`Desafio do dia · exercício ${currentIdx + 1} de ${exerciseQueue.length}`, `Daily challenge · exercise ${currentIdx + 1} of ${exerciseQueue.length}`)}</div>}
          {rangeCenterMidi != null && <div className="text-xs text-cyan-400 mt-1 font-mono">{L('🎧 Ajustado pra sua tessitura', '🎧 Adjusted to your range')}</div>}
        </div>
        <div className="card p-5 space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{L('Notas alvo', 'Target notes')}</div>
          <div className="flex flex-wrap gap-2">
            {currentExercise.targets.map((tg, i) => (
              <div key={i} className="px-3 py-2 bg-white/5 rounded-lg text-center min-w-[3rem]">
                <div className="text-sm font-bold font-mono">{midiToNoteName(tg.midi)}</div>
                <div className="text-[9px] text-slate-500 font-mono">{(tg.durationMs / 1000).toFixed(1)}s</div>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => setPlayGuide(g => !g)} className={`card p-4 w-full text-left flex items-center gap-3 transition-all ${playGuide ? 'border-cyan-500/40' : ''}`}>
          <span className="text-xl">{playGuide ? '🔊' : '🔇'}</span>
          <div className="flex-1">
            <div className="text-sm font-bold">{L('Tocar guia durante', 'Play guide while singing')}</div>
            <div className="text-[11px] text-slate-400">{playGuide ? L('As notas-guia vão tocar junto (pode vazar no microfone).', 'Guide notes will play along (may bleed into mic).') : L('Só playhead visual. Ouça antes pra decorar a melodia.', 'Visual playhead only. Listen first to learn the melody.')}</div>
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

  // ── Listening phase ──
  if (phase === 'listening' && currentExercise) {
    return (
      <div className="space-y-6 pb-24">
        <PitchMeter
          frame={pitch.currentFrame}
          targetMidi={currentTargetIdx >= 0 ? currentExercise.targets[currentTargetIdx].midi : undefined}
          targetLabel={currentTargetIdx >= 0 ? midiToNoteName(currentExercise.targets[currentTargetIdx].midi) : undefined}
          isListening={pitch.isListening}
          lang={lang}
        />
        <div className="text-center text-[11px] text-slate-500 font-mono">{playGuide ? L('Cante junto com o guia', 'Sing along with the guide') : L('Cante seguindo o playhead', 'Sing following the playhead')}</div>

        {/* Sequence progression — visual playhead */}
        <div className="card p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-3">{L('Sequência', 'Sequence')}</div>
          <div className="flex flex-wrap gap-2">
            {currentExercise.targets.map((tg, i) => (
              <div key={i} className={`px-3 py-2 rounded-lg text-center min-w-[3rem] transition-all ${i === currentTargetIdx ? 'bg-violet-500/30 border border-violet-400 scale-110' : i < currentTargetIdx ? 'bg-green-500/20 opacity-60' : 'bg-white/5'}`}>
                <div className="text-sm font-bold font-mono">{midiToNoteName(tg.midi)}</div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleStop} className="btn-primary w-full !bg-gradient-to-r !from-red-500 !to-orange-500"><i className="fas fa-stop mr-2"></i>{L('Encerrar agora', 'Stop now')}</button>
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
          <div className="card p-4 text-center"><div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">{t(lang, 'practice.accuracy')}</div><div className="text-2xl font-black font-mono text-green-400">{result.accuracyPct}%</div></div>
          <div className="card p-4 text-center"><div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">{t(lang, 'practice.timing')}</div><div className="text-2xl font-black font-mono text-violet-400">{result.timingPct}%</div></div>
          <div className="card p-4 text-center"><div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">{t(lang, 'practice.stability')}</div><div className="text-2xl font-black font-mono text-cyan-400">{result.stabilityPct}%</div></div>
        </div>

        {pitch.recordingUrl && (
          <div className="card p-5 space-y-3">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{lang === 'pt-BR' ? 'Sua gravação' : 'Your take'}</div>
            <audio controls src={pitch.recordingUrl} className="w-full" />
            <div className="text-[11px] text-slate-500 font-mono">
              {lang === 'pt-BR' ? 'Ouça sua última tentativa antes de refazer o exercício.' : 'Listen to your last take before trying again.'}
            </div>
          </div>
        )}

        {isDaily && exerciseQueue.length > 1 && (
          <div className="card p-4 text-center"><div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">{L('Média parcial', 'Partial average')}</div><div className="text-2xl font-black font-mono">{totalScore}%</div><div className="text-xs text-slate-500">{currentIdx + 1} / {exerciseQueue.length}</div></div>
        )}

        <div className="grid gap-3">
          {!isLast && exerciseQueue.length > 0 ? (
            <button onClick={goNext} className="btn-primary">{L('Próximo exercício', 'Next exercise')} <i className="fas fa-arrow-right ml-2"></i></button>
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
