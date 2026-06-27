import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { scoreExercise } from '../services/scoringService';
import { getExercisesByLevel } from '../data/exercises';
import { transposeExercise, centerOfMidis, transposeOffset } from '../services/theoryService';
import { ensureAudioStarted } from '../services/audioService';
import { PitchHighway } from './PitchHighway';
import type { Exercise, ExerciseResult, PitchFrame } from '../types';

interface PerformanceProps {
  onComplete: () => void;
}

// ──────────────────────────────────────────────────────────────────────────
// Performance — the game mode. Pick an exercise, then sing it as a scrolling
// "note highway" (PitchHighway) with live pitch tracking, and get scored. It
// reuses the existing timed exercises and the same scoreExercise engine as
// Practice, so scores are consistent across the app.
// ──────────────────────────────────────────────────────────────────────────

const TYPE_EMOJI: Record<string, string> = {
  'scale-runner': '🪜', 'arpeggio-drill': '🎹', 'interval-leap': '📏', 'pitch-hold': '⏱️',
};

export function Performance({ onComplete }: PerformanceProps) {
  const { profile, recordResult, touchStreak, unlockBadge, canAccessExercise, openUpgrade } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const L = (pt: string, en: string) => (lang === 'pt-BR' ? pt : en);

  const collectingRef = useRef(false);
  const framesRef = useRef<PitchFrame[]>([]);
  const finishedRef = useRef(false);

  const pitch = usePitchDetection({
    a4,
    micSensitivity: profile.settings.micSensitivity,
    noiseGate: profile.settings.noiseGate,
    smoothing: true,
    onFrame: (f) => { if (collectingRef.current && f.frequency > 0) framesRef.current.push(f); },
  });

  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup');
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [result, setResult] = useState<Omit<ExerciseResult, 'exerciseId' | 'completedAt'> | null>(null);

  const center = profile.settings.rangeCenterMidi;
  const options = useMemo(() => {
    return getExercisesByLevel(profile.settings.level).slice(0, 6).map(ex => {
      const offset = center ? transposeOffset(centerOfMidis(ex.targets.map(t => t.midi)), center) : 0;
      return offset ? transposeExercise(ex, offset) : ex;
    });
  }, [profile.settings.level, center]);

  const stopAll = useCallback(() => { collectingRef.current = false; pitch.stop(); }, [pitch]);
  useEffect(() => () => { stopAll(); }, [stopAll]);

  const begin = useCallback(async (ex: Exercise, sourceId: string) => {
    if (!canAccessExercise(sourceId)) { openUpgrade(); return; }
    setExercise(ex);
    setResult(null);
    framesRef.current = [];
    finishedRef.current = false;
    await ensureAudioStarted();
    await pitch.start();
    collectingRef.current = true;
    setStartTime(performance.now());
    setPhase('playing');
  }, [canAccessExercise, openUpgrade, pitch]);

  const finish = useCallback(() => {
    if (finishedRef.current || !exercise) return;
    finishedRef.current = true;
    stopAll();
    const sc = scoreExercise(exercise, framesRef.current, a4);
    setResult(sc);
    const full: ExerciseResult = { ...sc, exerciseId: exercise.id, completedAt: Date.now() };
    recordResult(full);
    touchStreak();
    if (!profile.badges.includes('first-practice')) unlockBadge('first-practice');
    if (sc.score >= 100 && !profile.badges.includes('perfect-score')) unlockBadge('perfect-score');
    setPhase('done');
  }, [exercise, a4, recordResult, touchStreak, unlockBadge, profile.badges, stopAll]);

  // ── Setup ──
  if (phase === 'setup') {
    return (
      <div className="space-y-5 pb-24">
        <div className="space-y-1">
          <h1 className="text-2xl font-black display tracking-tight">🎯 {L('Modo Performance', 'Performance Mode')}</h1>
          <p className="text-slate-400 text-sm">{L('Cante as notas conforme elas chegam na linha. Sua afinação é rastreada ao vivo e pontuada.', 'Sing the notes as they reach the line. Your pitch is tracked live and scored.')}</p>
        </div>
        <div className="card p-3 text-[11px] text-cyan-200/80 bg-cyan-500/5 border-cyan-500/20">
          🎧 {L('Dica: use fones pra mixagem perfeita. Sem fone, deixe o ambiente em silêncio.', 'Tip: use headphones for a perfect mix. Without them, keep the room quiet.')}
        </div>
        <div className="space-y-2">
          {options.map((ex, i) => {
            const locked = !canAccessExercise(ex.id);
            return (
              <button key={ex.id + i} onClick={() => begin(ex, ex.id)} className="card p-4 w-full text-left flex items-center justify-between hover:border-violet-500/40 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{TYPE_EMOJI[ex.type] ?? '🎵'}</span>
                  <div>
                    <div className="text-sm font-bold">{ex.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{ex.targets.length} {L('notas', 'notes')} · {ex.tempoBpm ?? 60} BPM</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-violet-400">{locked ? '🔒' : L('Cantar →', 'Sing →')}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Playing ──
  if (phase === 'playing' && exercise) {
    const f = pitch.currentFrame;
    return (
      <div className="space-y-4 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black display">{exercise.title}</h1>
          <button onClick={finish} className="btn-ghost text-xs">{L('Terminar', 'Finish')}</button>
        </div>
        <PitchHighway key={startTime} targets={exercise.targets} frame={f} startTime={startTime} running={phase === 'playing'} a4={a4} onFinish={finish} />
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-slate-400 font-mono">{L('Cantando:', 'Singing:')}</span>
          <span className={`font-black font-mono ${f && f.frequency > 0 ? 'text-cyan-300' : 'text-slate-600'}`}>
            {f && f.frequency > 0 ? f.noteName : '—'}
          </span>
        </div>
      </div>
    );
  }

  // ── Done ──
  if (phase === 'done' && result && exercise) {
    const grade = result.score >= 90 ? 'text-green-400' : result.score >= 70 ? 'text-amber-400' : 'text-red-400';
    const msg = result.score >= 90 ? L('Incrível! 🔥', 'Amazing! 🔥')
      : result.score >= 70 ? L('Muito bom! 👏', 'Great job! 👏')
      : L('Continue praticando 💪', 'Keep practicing 💪');
    const Bar = ({ label, pct }: { label: string; pct: number }) => (
      <div>
        <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{label}</span><span className="font-mono">{pct}%</span></div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full" style={{ width: `${pct}%` }} /></div>
      </div>
    );
    return (
      <div className="space-y-5 pb-24">
        <div className="card p-6 text-center space-y-2 ring-pop">
          <div className="text-sm text-slate-400 font-mono">{exercise.title}</div>
          <div className={`text-6xl font-black font-mono ${grade}`}>{result.score}%</div>
          <div className="text-lg font-bold display">{msg}</div>
          <div className="text-violet-400 text-sm font-mono">+{result.xpEarned} XP</div>
        </div>
        <div className="card p-5 space-y-3">
          <Bar label={L('Afinação', 'Accuracy')} pct={result.accuracyPct} />
          <Bar label={L('Tempo', 'Timing')} pct={result.timingPct} />
          <Bar label={L('Estabilidade', 'Stability')} pct={result.stabilityPct} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => begin(exercise, exercise.id)} className="btn-primary">{L('De novo', 'Again')}</button>
          <button onClick={() => { setPhase('setup'); setExercise(null); }} className="btn-ghost">{L('Outro exercício', 'Another')}</button>
        </div>
        <button onClick={onComplete} className="btn-ghost w-full text-xs">{L('Voltar ao início', 'Back home')}</button>
      </div>
    );
  }

  return null;
}
