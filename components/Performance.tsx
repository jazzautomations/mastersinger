import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { scoreExercise } from '../services/scoringService';
import { getExercisesByLevel } from '../data/exercises';
import { transposeExercise, centerOfMidis, transposeOffset } from '../services/theoryService';
import { ensureAudioStarted, playNote, stopAll } from '../services/audioService';
import { PitchHighway } from './PitchHighway';
import type { Exercise, ExerciseResult, ExerciseTarget, PitchFrame } from '../types';

interface PerformanceProps {
  onComplete: () => void;
}

// ──────────────────────────────────────────────────────────────────────────
// Performance — the game mode. Preview the melody (tap notes to hear them),
// then sing it as a scrolling "note highway" with live pitch tracking, and get
// scored. Your voice is recorded so you can play it back together with the
// reference notes. Reuses the existing timed exercises and the same
// scoreExercise engine as Practice.
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
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  const pitch = usePitchDetection({
    a4,
    record: true,
    micSensitivity: profile.settings.micSensitivity,
    noiseGate: profile.settings.noiseGate,
    smoothing: true,
    onFrame: (f) => { if (collectingRef.current && f.frequency > 0) framesRef.current.push(f); },
  });

  const [phase, setPhase] = useState<'setup' | 'preview' | 'playing' | 'done'>('setup');
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

  const stopVoice = useCallback(() => {
    if (voiceAudioRef.current) { voiceAudioRef.current.pause(); voiceAudioRef.current = null; }
  }, []);
  const stopEverything = useCallback(() => { collectingRef.current = false; pitch.stop(); stopAll(); stopVoice(); }, [pitch, stopVoice]);
  useEffect(() => () => { stopEverything(); }, [stopEverything]);

  // ── Play the reference melody (notes only) ──
  const playReference = useCallback(async (targets: ExerciseTarget[], removeLead: boolean) => {
    await ensureAudioStarted();
    stopAll(); stopVoice();
    const lead = removeLead ? (targets[0]?.startMs ?? 0) : 0;
    targets.forEach(t => playNote(t.midi, Math.min(t.durationMs * 0.9, 900), t.startMs - lead, a4));
  }, [a4, stopVoice]);

  // ── Play your recorded voice together with the reference notes ──
  const playVoiceWithReference = useCallback(async () => {
    if (!exercise) return;
    await ensureAudioStarted();
    stopAll(); stopVoice();
    const url = pitch.recordingUrl;
    if (url) {
      const audio = new Audio(url);
      voiceAudioRef.current = audio;
      audio.play().catch(() => {});
    }
    // Reference notes keep their lead so they line up with the recording.
    exercise.targets.forEach(t => playNote(t.midi, Math.min(t.durationMs * 0.9, 900), t.startMs, a4));
  }, [exercise, a4, pitch.recordingUrl, stopVoice]);

  const openPreview = useCallback((ex: Exercise) => {
    if (!canAccessExercise(ex.id)) { openUpgrade(); return; }
    stopEverything();
    setExercise(ex);
    setResult(null);
    setPhase('preview');
  }, [canAccessExercise, openUpgrade, stopEverything]);

  const begin = useCallback(async (ex: Exercise) => {
    setExercise(ex);
    setResult(null);
    framesRef.current = [];
    finishedRef.current = false;
    stopAll(); stopVoice();
    await ensureAudioStarted();
    await pitch.start();
    collectingRef.current = true;
    setStartTime(performance.now());
    setPhase('playing');
  }, [pitch, stopVoice]);

  const finish = useCallback(() => {
    if (finishedRef.current || !exercise) return;
    finishedRef.current = true;
    collectingRef.current = false;
    pitch.stop();
    const sc = scoreExercise(exercise, framesRef.current, a4);
    setResult(sc);
    const full: ExerciseResult = { ...sc, exerciseId: exercise.id, completedAt: Date.now() };
    recordResult(full);
    touchStreak();
    if (!profile.badges.includes('first-practice')) unlockBadge('first-practice');
    if (sc.score >= 100 && !profile.badges.includes('perfect-score')) unlockBadge('perfect-score');
    setPhase('done');
  }, [exercise, a4, recordResult, touchStreak, unlockBadge, profile.badges, pitch]);

  // ── Setup: choose an exercise ──
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
              <button key={ex.id + i} onClick={() => openPreview(ex)} className="card p-4 w-full text-left flex items-center justify-between hover:border-violet-500/40 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{TYPE_EMOJI[ex.type] ?? '🎵'}</span>
                  <div>
                    <div className="text-sm font-bold">{ex.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{ex.targets.length} {L('notas', 'notes')} · {ex.tempoBpm ?? 60} BPM</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-violet-400">{locked ? '🔒' : L('Abrir →', 'Open →')}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Preview: hear/tap the notes before singing ──
  if (phase === 'preview' && exercise) {
    return (
      <div className="space-y-4 pb-24">
        <div className="space-y-1">
          <button onClick={() => { stopEverything(); setPhase('setup'); }} className="btn-ghost text-xs"><i className="fas fa-arrow-left mr-2"></i>{L('Voltar', 'Back')}</button>
          <h1 className="text-xl font-black display">{exercise.title}</h1>
          <p className="text-slate-400 text-xs">{L('Toque numa nota pra ouvi-la, ou ouça a melodia inteira. Depois é só cantar.', 'Tap a note to hear it, or play the whole melody. Then sing it.')}</p>
        </div>
        <PitchHighway targets={exercise.targets} a4={a4} preview />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => playReference(exercise.targets, true)} className="btn-ghost"><i className="fas fa-play mr-2"></i>{L('Ouvir melodia', 'Play melody')}</button>
          <button onClick={() => begin(exercise)} className="btn-primary bg-gradient-to-r from-fuchsia-600 to-violet-600"><i className="fas fa-microphone mr-2"></i>{L('Cantar', 'Sing')}</button>
        </div>
      </div>
    );
  }

  // ── Playing: the live highway ──
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

  // ── Done: score + playback ──
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
        <div className="card p-4 space-y-2">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{L('Reescute', 'Play back')}</div>
          {pitch.recordingUrl ? (
            <button onClick={playVoiceWithReference} className="btn-primary w-full bg-gradient-to-r from-cyan-600 to-violet-600">
              <i className="fas fa-headphones mr-2"></i>{L('Sua voz + notas de referência', 'Your voice + reference notes')}
            </button>
          ) : (
            <div className="text-[11px] text-slate-500">{L('Gravação indisponível (permissão de microfone).', 'Recording unavailable (mic permission).')}</div>
          )}
          <button onClick={() => playReference(exercise.targets, true)} className="btn-ghost w-full text-sm">
            <i className="fas fa-music mr-2"></i>{L('Só as notas de referência', 'Reference notes only')}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => begin(exercise)} className="btn-primary">{L('De novo', 'Again')}</button>
          <button onClick={() => { stopEverything(); setPhase('setup'); setExercise(null); }} className="btn-ghost">{L('Outro exercício', 'Another')}</button>
        </div>
        <button onClick={() => { stopEverything(); onComplete(); }} className="btn-ghost w-full text-xs">{L('Voltar ao início', 'Back home')}</button>
      </div>
    );
  }

  return null;
}
