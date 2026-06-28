/**
 * VocalMatchGame — ouça a frase, cante nota por nota. Feedback em cents ao vivo.
 * Mecânica inspirada no "Vocal Match" do Theta, recalibrada para voz humana.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/store';
import { ensureAudioStarted, playSequence, playNote, stopAll } from '../../services/audioService';
import { midiToNoteName } from '../../services/theoryService';
import { generateVocalPhrase, VOCAL_LEVELS } from '../../data/games';
import { useSingThrough, type HitQuality } from './useSingThrough';
import { GameShell, TuneMeter, FeedbackBurst } from './GameShell';

const MAX_LEVEL = VOCAL_LEVELS.length;

export function VocalMatchGame({ onExit }: { onExit: () => void }) {
  const { profile, addXp, unlockBadge } = useStore();
  const a4 = profile.settings.a4;
  const center = profile.settings.rangeCenterMidi ?? 60;

  const [level, setLevel] = useState(1);
  const [targets, setTargets] = useState<number[]>([]);
  const [phase, setPhase] = useState<'intro' | 'listen' | 'sing' | 'done'>('intro');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [burst, setBurst] = useState<HitQuality | null>(null);
  const burstTimer = useRef<number | null>(null);
  const playTimer = useRef<number | null>(null);

  const flashBurst = useCallback((q: HitQuality) => {
    setBurst(q);
    if (burstTimer.current) clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(null), 450);
  }, []);

  const onHit = useCallback((_i: number, quality: HitQuality) => {
    flashBurst(quality);
    setScore((s) => s + (quality === 'perfect' ? 100 : 55));
    setStreak((s) => {
      const ns = s + 1;
      setBest((b) => Math.max(b, ns));
      return ns;
    });
  }, [flashBurst]);

  const onComplete = useCallback(() => {
    setPhase('done');
    const bonus = 50 + level * 10;
    addXp(bonus);
    if (level >= 4) unlockBadge('game-vocal-match');
    playTimer.current = window.setTimeout(() => {
      setLevel((l) => Math.min(MAX_LEVEL, l + 1));
    }, 1400);
  }, [level, addXp, unlockBadge]);

  const sing = useSingThrough(targets, { a4, active: phase === 'sing', onHit, onComplete });

  // tocar a frase de referência, depois liberar o canto
  const playReference = useCallback(async (notes: number[]) => {
    setPhase('listen');
    await ensureAudioStarted();
    playSequence(notes, 550, 90, a4);
    const total = notes.length * (550 + 90) + 250;
    if (playTimer.current) clearTimeout(playTimer.current);
    playTimer.current = window.setTimeout(() => setPhase('sing'), total);
  }, [a4]);

  // novo nível
  useEffect(() => {
    const notes = generateVocalPhrase(level, center);
    setTargets(notes);
    sing.reset();
    void playReference(notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // iniciar o microfone uma vez
  useEffect(() => {
    void (async () => { await ensureAudioStarted(); await sing.start(); })();
    return () => {
      sing.stop();
      stopAll();
      if (burstTimer.current) clearTimeout(burstTimer.current);
      if (playTimer.current) clearTimeout(playTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replay = useCallback(() => {
    if (phase === 'listen') return;
    void playReference(targets);
    sing.reset();
  }, [phase, targets, playReference, sing]);

  const cfg = VOCAL_LEVELS[Math.min(level - 1, MAX_LEVEL - 1)];

  return (
    <GameShell
      emoji="🎤"
      title="Vocal Match"
      subtitle={profile.settings.language === 'en' ? 'Hear the phrase, sing it back note by note' : 'Ouça a frase e cante nota por nota'}
      onExit={onExit}
      score={score}
      streak={streak}
      best={best}
      badge={`Nível ${level}/${MAX_LEVEL}`}
    >
      <FeedbackBurst quality={burst} />

      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="text-sm">
          <div className="text-slate-400 text-[11px] uppercase tracking-wider">Nível {level}</div>
          <div className="font-semibold">{phaseLabel(phase, sing.idx, targets.length)}</div>
        </div>
        <button
          onClick={replay}
          disabled={phase === 'listen'}
          className="btn-secondary text-xs px-4 py-2 disabled:opacity-40"
        >
          🔊 Ouvir de novo
        </button>
      </div>

      {/* frase: cabeças clicáveis (toca a nota) */}
      <div className="card p-4">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Frase melódica — toque para ouvir</div>
        <div className="flex gap-2 flex-wrap">
          {targets.map((midi, i) => {
            const done = i < sing.idx;
            const current = i === sing.idx && phase === 'sing';
            return (
              <button
                key={i}
                onClick={async () => { await ensureAudioStarted(); playNote(midi, 500, 0, a4); }}
                className={`px-3 py-2 rounded-xl border text-center min-w-[58px] transition-all ${
                  done ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : current ? 'bg-amber-500/20 border-amber-500/40 text-amber-200 animate-pulse'
                  : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                <div className="font-bold text-sm">{midiToNoteName(midi)}</div>
                <div className="text-[10px] mt-0.5">{done ? '✓' : current ? '→ cante' : '·'}</div>
              </button>
            );
          })}
        </div>
      </div>

      <TuneMeter cents={phase === 'sing' ? sing.liveCents : null} level={sing.micLevel} />

      {phase === 'listen' && (
        <p className="text-center text-xs text-amber-300/80 animate-pulse">🔊 Ouça a frase...</p>
      )}
      {phase === 'done' && (
        <div className="card p-5 text-center bg-emerald-500/10 border-emerald-500/30">
          <div className="text-3xl mb-1">🎉</div>
          <div className="font-black display text-emerald-300">Nível {level} completo!</div>
          <div className="text-xs text-slate-400 mt-1">+{50 + level * 10} XP {level < MAX_LEVEL ? '· próximo nível...' : '· você zerou o jogo! 👑'}</div>
        </div>
      )}

      {!sing.isListening && (
        <p className="text-center text-xs text-rose-300/80">🎙️ Permita o microfone para jogar.</p>
      )}
    </GameShell>
  );
}

function phaseLabel(phase: string, idx: number, total: number): string {
  if (phase === 'listen') return 'Ouvindo a referência...';
  if (phase === 'done') return 'Completo!';
  if (total === 0) return 'Preparando...';
  return `Cante a nota ${Math.min(idx + 1, total)} de ${total}`;
}
