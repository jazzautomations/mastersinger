/**
 * SightSingGame — leitura cantada (sight-singing). Mostra uma frase na pauta;
 * o jogador ouve só a tônica de referência e canta as notas lidas, em ordem.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/store';
import { ensureAudioStarted, playNote, playSequence, stopAll } from '../../services/audioService';
import { makeSightPhrase, type SightPhrase } from '../../data/games';
import { useSingThrough, type HitQuality } from './useSingThrough';
import { GameShell, TuneMeter, FeedbackBurst } from './GameShell';
import { Staff } from './Staff';

export function SightSingGame({ onExit }: { onExit: () => void }) {
  const { profile, addXp, unlockBadge } = useStore();
  const a4 = profile.settings.a4;
  const en = profile.settings.language === 'en';
  const center = profile.settings.rangeCenterMidi ?? 60;

  const [phrase, setPhrase] = useState<SightPhrase | null>(null);
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<'ref' | 'sing' | 'done'>('ref');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [burst, setBurst] = useState<HitQuality | null>(null);
  const [revealed, setRevealed] = useState(false); // tocou a frase como "colar"
  const burstTimer = useRef<number | null>(null);
  const refTimer = useRef<number | null>(null);

  const targets = phrase?.notes ?? [];

  const playTonicRef = useCallback(async (p: SightPhrase) => {
    setPhase('ref');
    setRevealed(false);
    await ensureAudioStarted();
    // só a tônica (sight-singing de verdade): tônica longa
    playNote(p.tonic, 900, 0, a4);
    if (refTimer.current) clearTimeout(refTimer.current);
    refTimer.current = window.setTimeout(() => setPhase('sing'), 1050);
  }, [a4]);

  const onHit = useCallback((_i: number, quality: HitQuality) => {
    setBurst(quality);
    if (burstTimer.current) clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(null), 450);
    setScore((s) => s + (quality === 'perfect' ? 100 : 55));
    setStreak((s) => { const ns = s + 1; setBest((b) => Math.max(b, ns)); return ns; });
  }, []);

  const onComplete = useCallback(() => {
    setPhase('done');
    addXp(40 + level * 8);
    setCleared((n) => { const nn = n + 1; if (nn >= 5) unlockBadge('game-sight-sing'); return nn; });
    if (refTimer.current) clearTimeout(refTimer.current);
    refTimer.current = window.setTimeout(() => setLevel((l) => l + 1), 1300);
  }, [level, addXp, unlockBadge]);

  const sing = useSingThrough(targets, { a4, active: phase === 'sing', onHit, onComplete });

  // nova frase a cada nível
  useEffect(() => {
    const p = makeSightPhrase(center, level);
    setPhrase(p);
    sing.reset();
    void playTonicRef(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  useEffect(() => {
    void sing.start();
    return () => {
      sing.stop();
      stopAll();
      if (burstTimer.current) clearTimeout(burstTimer.current);
      if (refTimer.current) clearTimeout(refTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reveal = useCallback(async () => {
    if (!phrase) return;
    setRevealed(true);
    await ensureAudioStarted();
    playSequence(phrase.notes, 480, 70, a4);
  }, [phrase, a4]);

  return (
    <GameShell
      emoji="👀"
      title={en ? 'Sight-Singing' : 'Leitura Cantada'}
      subtitle={en ? 'Read the staff and sing the notes in order' : 'Leia a pauta e cante as notas em ordem'}
      onExit={onExit}
      score={score}
      streak={streak}
      best={best}
      badge={`Nível ${level}`}
    >
      <FeedbackBurst quality={burst} />

      {phrase && <Staff notes={phrase.notes} currentIdx={phase === 'sing' ? sing.idx : -1} doneCount={phase === 'done' ? phrase.notes.length : sing.idx} />}

      <div className="card p-4 flex items-center justify-between gap-3">
        <div className="text-sm">
          <div className="text-slate-400 text-[11px] uppercase tracking-wider">{en ? 'Reference' : 'Referência'}</div>
          <div className="font-semibold">
            {phase === 'ref' ? (en ? 'Listen to the tonic...' : 'Ouça a tônica...')
              : phase === 'done' ? (en ? 'Cleared! 🎉' : 'Completo! 🎉')
              : (en ? `Sing note ${Math.min(sing.idx + 1, targets.length)}/${targets.length}` : `Cante a nota ${Math.min(sing.idx + 1, targets.length)}/${targets.length}`)}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => phrase && playTonicRef(phrase)} className="btn-secondary text-xs px-3 py-2">🎵 {en ? 'Tonic' : 'Tônica'}</button>
          <button onClick={reveal} disabled={revealed} className="btn-secondary text-xs px-3 py-2 disabled:opacity-40">👂 {en ? 'Hint' : 'Colar'}</button>
        </div>
      </div>

      <TuneMeter cents={phase === 'sing' ? sing.liveCents : null} level={sing.micLevel} />

      {phase === 'done' && (
        <div className="card p-5 text-center bg-emerald-500/10 border-emerald-500/30">
          <div className="text-3xl mb-1">🎉</div>
          <div className="font-black display text-emerald-300">{en ? 'Phrase cleared!' : 'Frase lida!'}</div>
          <div className="text-xs text-slate-400 mt-1">+{40 + level * 8} XP · {en ? 'next phrase...' : 'próxima frase...'}</div>
        </div>
      )}

      <p className="text-center text-[11px] text-slate-500">
        {en
          ? '"Hint" plays the whole phrase — but no points for relying on it. Real sight-singing reads from the page.'
          : 'O "Colar" toca a frase inteira — mas o ideal é ler da pauta. É assim que você treina leitura de verdade.'}
      </p>

      {!sing.isListening && (
        <p className="text-center text-xs text-rose-300/80">🎙️ {en ? 'Allow the microphone to play.' : 'Permita o microfone para jogar.'}</p>
      )}
    </GameShell>
  );
}
