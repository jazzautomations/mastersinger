/**
 * EarBlitzGame — ear-training relâmpago. 60s, responda o máximo de rodadas:
 * intervalos (mel/harm), escala, acorde, cadência. Combo multiplica pontos.
 * Sem microfone — reusa makeEarQuestion do EarTraining.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/store';
import { ensureAudioStarted, playNote, playChord, stopAll, beginPlayback, isPlaybackActive } from '../../services/audioService';
import { makeEarQuestion } from '../../data/earQuestions';
import type { EarQuestion, EarQuestionType } from '../../types';
import { GameShell } from './GameShell';

const ROUND_SECONDS = 60;
const TYPES: EarQuestionType[] = ['interval-melodic', 'interval-harmonic', 'scale-identify', 'chord-identify', 'cadence-identify'];

export function EarBlitzGame({ onExit }: { onExit: () => void }) {
  const { profile, addXp, unlockBadge } = useStore();
  const en = profile.settings.language === 'en';
  const a4 = profile.settings.a4;
  const level = profile.settings.level;
  const center = profile.settings.rangeCenterMidi;

  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [question, setQuestion] = useState<EarQuestion | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);

  const timersRef = useRef<number[]>([]);
  const tickRef = useRef<number | null>(null);
  const nextTimer = useRef<number | null>(null);

  const clearTimers = () => { timersRef.current.forEach((id) => clearTimeout(id)); timersRef.current = []; };

  const playQ = useCallback(async (q: EarQuestion) => {
    clearTimers();
    stopAll();
    try { await ensureAudioStarted(); } catch { return; }
    const seq = q.audioSequence;
    if (q.type === 'interval-harmonic' || q.type === 'chord-identify') {
      playChord(seq.map((s) => s.midi), seq[0]?.durationMs ?? 1200, a4);
    } else {
      const token = beginPlayback();
      let acc = 0;
      seq.forEach((s) => {
        const id = window.setTimeout(() => { if (isPlaybackActive(token)) playNote(s.midi, s.durationMs * 0.9, 0, a4); }, acc);
        timersRef.current.push(id);
        acc += s.durationMs;
      });
    }
  }, [a4]);

  const newQuestion = useCallback(() => {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const q = makeEarQuestion(type, level, Math.random() * 1000, center);
    setQuestion(q);
    setPicked(null);
    void playQ(q);
  }, [level, center, playQ]);

  const start = useCallback(async () => {
    await ensureAudioStarted();
    setPhase('playing');
    setTimeLeft(ROUND_SECONDS);
    setScore(0); setCombo(0); setBestCombo(0); setCorrect(0); setAnswered(0);
    newQuestion();
  }, [newQuestion]);

  // contador regressivo
  useEffect(() => {
    if (phase !== 'playing') return;
    tickRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setPhase('over');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [phase]);

  // ao terminar: premiar XP
  const overHandled = useRef(false);
  useEffect(() => {
    if (phase === 'over' && !overHandled.current) {
      overHandled.current = true;
      addXp(Math.round(score / 8));
      if (correct >= 15) unlockBadge('game-ear-blitz');
      clearTimers(); stopAll();
    }
    if (phase === 'playing') overHandled.current = false;
  }, [phase, score, correct, addXp, unlockBadge]);

  useEffect(() => () => { clearTimers(); stopAll(); if (tickRef.current) clearInterval(tickRef.current); if (nextTimer.current) clearTimeout(nextTimer.current); }, []);

  const answer = useCallback((opt: string) => {
    if (!question || picked) return;
    setPicked(opt);
    setAnswered((a) => a + 1);
    const ok = opt === question.answer;
    if (ok) {
      setCombo((c) => {
        const nc = c + 1;
        setBestCombo((b) => Math.max(b, nc));
        setScore((s) => s + 50 + Math.min(nc, 8) * 10); // bônus de combo
        return nc;
      });
      setCorrect((n) => n + 1);
    } else {
      setCombo(0);
    }
    if (nextTimer.current) clearTimeout(nextTimer.current);
    nextTimer.current = window.setTimeout(() => { if (phase === 'playing') newQuestion(); }, ok ? 550 : 1100);
  }, [question, picked, phase, newQuestion]);

  const typeLabel = (t: EarQuestionType): string => {
    const m: Record<EarQuestionType, [string, string]> = {
      'interval-melodic': ['Intervalo melódico', 'Melodic interval'],
      'interval-harmonic': ['Intervalo harmônico', 'Harmonic interval'],
      'scale-identify': ['Que escala?', 'Which scale?'],
      'chord-identify': ['Que acorde?', 'Which chord?'],
      'cadence-identify': ['Que cadência?', 'Which cadence?'],
    };
    return en ? m[t][1] : m[t][0];
  };

  return (
    <GameShell
      emoji="⚡"
      title="Ear Blitz"
      subtitle={en ? 'Answer as many as you can in 60s' : 'Responda o máximo que puder em 60s'}
      onExit={onExit}
      score={score}
      streak={combo}
      best={bestCombo}
      badge={phase === 'playing' ? `⏱️ ${timeLeft}s` : en ? 'ready' : 'pronto'}
    >
      {phase === 'ready' && (
        <div className="card p-6 text-center space-y-3">
          <div className="text-4xl">⚡</div>
          <p className="text-sm text-slate-300">
            {en
              ? '60 seconds. Intervals, scales, chords & cadences. Build a combo for bonus points!'
              : '60 segundos. Intervalos, escalas, acordes e cadências. Faça combo pra ganhar bônus!'}
          </p>
          <button onClick={start} className="btn-primary px-8 py-3 text-sm">▶ {en ? 'Start' : 'Começar'}</button>
        </div>
      )}

      {phase === 'playing' && question && (
        <>
          {/* barra de tempo */}
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%` }} />
          </div>

          <div className="card p-5 text-center">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-3">{typeLabel(question.type)}</div>
            <button onClick={() => playQ(question)} className="btn-secondary text-sm px-6 py-3">🔊 {en ? 'Replay' : 'Ouvir'}</button>
            {combo >= 3 && <div className="text-xs text-amber-400 font-bold mt-3 animate-pulse">🔥 Combo x{combo}!</div>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {question.options.map((opt) => {
              const isAns = opt === question.answer;
              const isPicked = opt === picked;
              const show = picked !== null;
              return (
                <button
                  key={opt}
                  onClick={() => answer(opt)}
                  disabled={show}
                  className={`p-3 rounded-xl border text-sm font-semibold transition-all ${
                    show
                      ? isAns
                        ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-200'
                        : isPicked
                          ? 'bg-rose-500/25 border-rose-500/50 text-rose-200'
                          : 'bg-white/5 border-white/10 text-slate-500'
                      : 'bg-white/5 border-white/10 text-slate-200 hover:border-cyan-500/40 hover:bg-cyan-500/10'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="text-center text-xs text-slate-500">{correct}/{answered} {en ? 'correct' : 'certas'}</div>
        </>
      )}

      {phase === 'over' && (
        <div className="card p-6 text-center space-y-2">
          <div className="text-4xl">{correct >= 15 ? '🏆' : '⏱️'}</div>
          <div className="font-black display text-xl neon-text">{en ? "Time's up!" : 'Acabou o tempo!'}</div>
          <div className="text-sm text-slate-300">{en ? 'Final score' : 'Pontuação'}: <span className="font-bold text-white">{score}</span></div>
          <div className="text-xs text-slate-400">{correct}/{answered} {en ? 'correct' : 'certas'} · {en ? 'best combo' : 'melhor combo'} x{bestCombo} · +{Math.round(score / 8)} XP</div>
          <button onClick={start} className="btn-primary px-8 py-3 text-sm mt-2">🔄 {en ? 'Play again' : 'Jogar de novo'}</button>
        </div>
      )}
    </GameShell>
  );
}
