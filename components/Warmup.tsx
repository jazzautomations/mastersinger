import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { WARMUP_ROUTINES, getWarmupById } from '../data/warmups';
import {
  playDrone, stopDrone, playSequence, stopAll, ensureAudioStarted,
} from '../services/audioService';
import { midiToNoteName } from '../services/theoryService';
import type { WarmupRoutine, WarmupStep, WarmupGuide, PitchFrame } from '../types';

interface WarmupProps {
  routineId?: string;
  onExit?: () => void;
}

type Phase = 'select' | 'running' | 'done';

export function Warmup({ routineId, onExit }: WarmupProps) {
  const { profile, addXp, touchStreak, unlockBadge } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const micSensitivity = profile.settings.micSensitivity ?? 0.5;
  const noiseGate = profile.settings.noiseGate ?? 0.02;

  const [routine, setRoutine] = useState<WarmupRoutine | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [liveCents, setLiveCents] = useState(0);
  const [liveNote, setLiveNote] = useState('');
  const [voicedRatio, setVoicedRatio] = useState(0);

  const framesRef = useRef<PitchFrame[]>([]);
  const voicedRef = useRef(0);
  const windowRef = useRef(0);
  const stepStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const guidePlayingRef = useRef(false);

  const pitch = usePitchDetection({
    a4,
    micSensitivity,
    noiseGate,
    onFrame: (frame) => {
      framesRef.current.push(frame);
      // count voiced frames only inside pitched steps (windowRef > 0)
      if (windowRef.current > 0) {
        if (frame.frequency > 0) voicedRef.current++;
        windowRef.current++;
      }
      if (frame.frequency > 0) {
        setLiveCents(frame.cents);
        setLiveNote(frame.noteName);
      }
    },
  });

  // ── Guide playback ──
  const playGuide = useCallback((guide: WarmupGuide | undefined, stepMs: number) => {
    if (!guide) return;
    if (guide.type === 'tone' && guide.midi != null) {
      playDrone(guide.midi, a4);
      guidePlayingRef.current = true;
    } else if (guide.type === 'sequence' && guide.midis && guide.beatMs) {
      playSequence(guide.midis, guide.beatMs);
    } else if (guide.type === 'glide' && guide.fromMidi != null && guide.toMidi != null) {
      const range = Math.abs(guide.toMidi - guide.fromMidi);
      const steps: number[] = [];
      const dir = guide.toMidi > guide.fromMidi ? 1 : -1;
      for (let m = guide.fromMidi; (dir > 0 ? m <= guide.toMidi : m >= guide.toMidi); m += dir) steps.push(m);
      for (let m = guide.toMidi - dir; (dir > 0 ? m >= guide.fromMidi : m <= guide.fromMidi); m -= dir) steps.push(m);
      const beatMs = Math.max(120, (stepMs * 0.85) / Math.max(1, steps.length));
      playSequence(steps, beatMs);
    }
  }, [a4]);

  const stopGuide = useCallback(() => {
    stopDrone();
    stopAll();
    guidePlayingRef.current = false;
  }, []);

  // ── Step runner ──
  const beginStep = useCallback((idx: number, r: WarmupRoutine) => {
    const step = r.steps[idx];
    setStepIdx(idx);
    setElapsedMs(0);
    setLiveCents(0);
    setLiveNote('');
    voicedRef.current = 0;
    windowRef.current = step.tracksPitch ? 1 : 0;
    stepStartRef.current = performance.now();

    if (step.guide) playGuide(step.guide, step.durationMs);
    if (step.tracksPitch && !pitch.isListening) void pitch.start();

    const tick = () => {
      const el = performance.now() - stepStartRef.current;
      setElapsedMs(el);
      if (el < step.durationMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        finishStep(idx, r);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [playGuide, pitch]);

  const finishStep = useCallback((idx: number, r: WarmupRoutine) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopGuide();
    const step = r.steps[idx];
    if (step.tracksPitch && windowRef.current > 0) {
      setVoicedRatio(Math.round((voicedRef.current / windowRef.current) * 100));
    }
    windowRef.current = 0;
    if (idx + 1 < r.steps.length) {
      beginStep(idx + 1, r);
    } else {
      finishRoutine(r);
    }
  }, [beginStep, stopGuide]);

  const finishRoutine = useCallback((r: WarmupRoutine) => {
    pitch.stop();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopGuide();
    const xp = r.totalMinutes * 6;
    addXp(xp);
    touchStreak();
    if (!profile.badges.includes('first-warmup')) unlockBadge('first-warmup');
    setPhase('done');
  }, [pitch, stopGuide, addXp, touchStreak, unlockBadge, profile.badges]);

  // ── Start a routine ──
  const startRoutine = useCallback(async (r: WarmupRoutine) => {
    await ensureAudioStarted();
    setRoutine(r);
    setPhase('running');
    framesRef.current = [];
    setVoicedRatio(0);
    // mic warms up on first pitched step; start it now if any step tracks pitch
    if (r.steps.some(s => s.tracksPitch)) {
      try { await pitch.start(); } catch { /* permission handled in hook error state */ }
    }
    beginStep(0, r);
  }, [pitch, beginStep]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      pitch.stop();
      stopGuide();
    };
  }, [pitch, stopGuide]);

  // deep-link to a routine
  useEffect(() => {
    if (routineId) {
      const r = getWarmupById(routineId);
      if (r && phase === 'select') startRoutine(r);
    }
  }, [routineId, phase, startRoutine]);

  // ── Select phase ──
  if (phase === 'select') {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'warmup.title')}</h1>
          <p className="text-slate-400 text-sm">{t(lang, 'warmup.subtitle')}</p>
        </div>

        <div className="card p-4 border-cyan-500/20 bg-cyan-500/5">
          <div className="flex gap-3">
            <span className="text-2xl">🔥</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {lang === 'pt-BR'
                ? 'Aquecimento guiado: o app toca a referência e você canta junto, vendo sua afinação em tempo real. Destrava a voz antes de praticar — previne cansaço e lesão.'
                : 'Guided warmup: the app plays a reference and you sing along, watching your pitch in real time. Unlocks your voice before practicing — prevents fatigue and injury.'}
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {WARMUP_ROUTINES.map(r => (
            <button
              key={r.id}
              onClick={() => startRoutine(r)}
              className="card p-5 text-left hover:border-cyan-500/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="text-3xl">🔥</div>
                <div className="flex-1">
                  <div className="text-xs text-cyan-400 font-mono uppercase tracking-wider">~{r.totalMinutes} min · {r.steps.length} {lang === 'pt-BR' ? 'etapas' : 'steps'}</div>
                  <div className="text-base font-bold">{r.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{r.description}</div>
                </div>
                <span className="text-cyan-400"><i className="fas fa-play"></i></span>
              </div>
            </button>
          ))}
        </div>

        {onExit && (
          <button onClick={onExit} className="btn-ghost w-full">{t(lang, 'common.back')}</button>
        )}
      </div>
    );
  }

  // ── Done phase ──
  if (phase === 'done' && routine) {
    const xp = routine.totalMinutes * 6;
    return (
      <div className="space-y-6 pb-24">
        <div className="card p-8 text-center space-y-3 ring-pop">
          <div className="text-6xl">🔥</div>
          <div className="text-2xl font-black display neon-text">{t(lang, 'warmup.done')}</div>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {lang === 'pt-BR'
              ? 'Sua voz está aquecida e pronta. Vá praticar que sua afinação e estabilidade vão estar bem melhores.'
              : 'Your voice is warm and ready. Go practice — your pitch and stability will be noticeably better.'}
          </p>
          <div className="text-violet-400 text-sm font-mono">+{xp} XP</div>
        </div>

        {voicedRatio > 0 && (
          <div className="card p-4 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">
              {lang === 'pt-BR' ? 'Participação vocal' : 'Vocal participation'}
            </div>
            <div className="text-2xl font-black font-mono text-cyan-400">{voicedRatio}%</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {lang === 'pt-BR' ? 'quanto da janela de canto você produziu som' : 'how much of the singing windows you phonated'}
            </div>
          </div>
        )}

        <div className="grid gap-3">
          <button onClick={() => { setPhase('select'); setRoutine(null); }} className="btn-primary">
            <i className="fas fa-redo mr-2"></i>{lang === 'pt-BR' ? 'Aquecer de novo' : 'Warm up again'}
          </button>
          {onExit && (
            <button onClick={onExit} className="btn-ghost">{t(lang, 'common.back')}</button>
          )}
        </div>
      </div>
    );
  }

  // ── Running phase ──
  const step: WarmupStep | undefined = routine?.steps[stepIdx];
  if (phase === 'running' && routine && step) {
    const totalSteps = routine.steps.length;
    const stepPct = Math.min(100, (elapsedMs / step.durationMs) * 100);
    const showPitch = !!step.tracksPitch;
    const centsColor = Math.abs(liveCents) < 10 ? 'text-green-400' : Math.abs(liveCents) < 25 ? 'text-amber-400' : 'text-red-400';

    // current target within this step (for display)
    const nowInStep = elapsedMs;
    const activeTarget = step.targets?.find(tg => nowInStep >= tg.startMs && nowInStep < tg.startMs + tg.durationMs);

    return (
      <div className="space-y-5 pb-24">
        {/* progress header */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400">
            <span>{lang === 'pt-BR' ? 'Etapa' : 'Step'} {stepIdx + 1}/{totalSteps}</span>
            <span>{routine.title}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full transition-all" style={{ width: `${stepPct}%` }} />
          </div>
        </div>

        {/* step card */}
        <div className="card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">
              {step.kind === 'info' ? '🧘' : step.kind === 'breath' ? '🌬️' : step.kind === 'glide' ? '〰️' : step.kind === 'scale' ? '🪜' : step.kind === 'siren' ? '🚨' : '🎯'}
            </span>
            <div className="flex-1">
              <h2 className="text-xl font-black display tracking-tight">{step.title}</h2>
              <div className="text-[11px] text-slate-500 font-mono">{Math.ceil((step.durationMs - elapsedMs) / 1000)}s {lang === 'pt-BR' ? 'restantes' : 'left'}</div>
            </div>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed">{step.instructions}</p>

          {/* live pitch overlay */}
          {showPitch && (
            <div className="bg-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'tuner.note')}</span>
                <span className={`text-4xl font-black font-mono ${centsColor} ${liveNote ? 'pulse-soft' : ''}`}>{liveNote || '—'}</span>
              </div>
              <div className="relative h-3 rounded-full gauge-bg overflow-hidden">
                <div className="absolute top-0 bottom-0 w-1 bg-white transition-all duration-75" style={{ left: `${Math.max(0, Math.min(100, ((liveCents + 50) / 100) * 100))}%`, transform: 'translateX(-50%)' }} />
              </div>
              {activeTarget && (
                <div className="text-center text-xs text-cyan-300 font-mono">
                  {lang === 'pt-BR' ? 'Alvo agora' : 'Target now'}: <span className="font-bold">{midiToNoteName(activeTarget.midi)}</span>
                  <span className="ml-2 text-slate-500">±{liveCents > 0 ? '+' : ''}{liveCents} cents</span>
                </div>
              )}
            </div>
          )}

          {step.tip && (
            <div className="bg-cyan-500/10 border-l-2 border-cyan-500 p-3 rounded-r-lg">
              <div className="flex gap-2">
                <span className="text-cyan-400 text-sm">💡</span>
                <p className="text-sm text-cyan-100 leading-relaxed">{step.tip}</p>
              </div>
            </div>
          )}
        </div>

        {pitch.error && (
          <div className="card p-3 border-red-500/30 text-center text-red-400 text-sm">{pitch.error}</div>
        )}

        <button
          onClick={() => { pitch.stop(); stopGuide(); if (rafRef.current) cancelAnimationFrame(rafRef.current); finishRoutine(routine); }}
          className="btn-ghost w-full"
        >
          {lang === 'pt-BR' ? 'Encerrar aquecimento' : 'End warmup'}
        </button>
      </div>
    );
  }

  // Fallback: running phase but routine/step missing (shouldn't happen, but recover gracefully)
  if (phase === 'running') {
    return (
      <div className="space-y-6 pb-24 text-center">
        <p className="text-slate-400 text-sm">{lang === 'pt-BR' ? 'Algo deu errado. Tente novamente.' : 'Something went wrong. Please try again.'}</p>
        <button onClick={() => { setPhase('select'); setRoutine(null); }} className="btn-primary">
          {lang === 'pt-BR' ? 'Voltar' : 'Go back'}
        </button>
      </div>
    );
  }

  return null;
}
