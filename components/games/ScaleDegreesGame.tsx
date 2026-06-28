/**
 * ScaleDegreesGame — canto de graus da escala / solfejo móvel.
 * Toca a tônica de referência e pede para cantar um grau (1..7 / Dó..Si).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/store';
import { ensureAudioStarted, playNote, playSequence, stopAll } from '../../services/audioService';
import { midiToNoteName } from '../../services/theoryService';
import { makeDegreeRound, SOLFEGE, SOLFEGE_EN, type DegreeRound } from '../../data/games';
import { useSingThrough, type HitQuality } from './useSingThrough';
import { GameShell, TuneMeter, FeedbackBurst } from './GameShell';

export function ScaleDegreesGame({ onExit }: { onExit: () => void }) {
  const { profile, addXp, unlockBadge } = useStore();
  const a4 = profile.settings.a4;
  const en = profile.settings.language === 'en';
  const center = profile.settings.rangeCenterMidi ?? 60;

  const [round, setRound] = useState<DegreeRound | null>(null);
  const [roundNum, setRoundNum] = useState(0); // muda → effect monta novo round
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [solved, setSolved] = useState(0);
  const [burst, setBurst] = useState<HitQuality | null>(null);
  const [phase, setPhase] = useState<'ref' | 'sing'>('ref');
  const burstTimer = useRef<number | null>(null);
  const refTimer = useRef<number | null>(null);
  const scoreRef = useRef(0);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const targets = round ? [round.targetMidi] : [];

  const playTonic = useCallback(async (r: DegreeRound) => {
    setPhase('ref');
    await ensureAudioStarted();
    // estabelece a tonalidade: arpejo tônica-3ª-5ª-tônica
    playSequence([r.scale[0], r.scale[2], r.scale[4], r.scale[0]], 280, 40, a4);
    if (refTimer.current) clearTimeout(refTimer.current);
    refTimer.current = window.setTimeout(() => setPhase('sing'), 4 * 320 + 200);
  }, [a4]);

  const onHit = useCallback((_i: number, quality: HitQuality) => {
    setBurst(quality);
    if (burstTimer.current) clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(null), 450);
    setScore((s) => s + (quality === 'perfect' ? 100 : 55));
    setStreak((s) => { const ns = s + 1; setBest((b) => Math.max(b, ns)); return ns; });
    addXp(quality === 'perfect' ? 12 : 7);
    setSolved((n) => { const nn = n + 1; if (nn >= 10) unlockBadge('game-scale-degrees'); return nn; });
  }, [addXp, unlockBadge]);

  const onComplete = useCallback(() => {
    // round de 1 alvo: avança após uma pausa
    if (refTimer.current) clearTimeout(refTimer.current);
    refTimer.current = window.setTimeout(() => setRoundNum((n) => n + 1), 750);
  }, []);

  const sing = useSingThrough(targets, { a4, active: phase === 'sing', onHit, onComplete });

  // (re)monta um round sempre que roundNum muda
  useEffect(() => {
    const maxDeg = Math.min(7, 3 + Math.floor(scoreRef.current / 400));
    const r = makeDegreeRound(center, maxDeg);
    setRound(r);
    sing.reset();
    void playTonic(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundNum]);

  // inicia o microfone uma vez
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

  const replayTonic = useCallback(() => { if (round) void playTonic(round); }, [round, playTonic]);

  const solf = en ? SOLFEGE_EN : SOLFEGE;
  const degreeIdx = round?.degreeIdx ?? 0;

  return (
    <GameShell
      emoji="🎼"
      title={en ? 'Scale Degrees' : 'Graus da Escala'}
      subtitle={en ? 'Hear the key, then sing the asked degree' : 'Ouça a tônica e cante o grau pedido'}
      onExit={onExit}
      score={score}
      streak={streak}
      best={best}
      badge={en ? `${solved} solved` : `${solved} resolvidos`}
    >
      <FeedbackBurst quality={burst} />

      <div className="card p-6 text-center">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">
          {phase === 'ref' ? (en ? 'Listen to the key...' : 'Ouça a tonalidade...') : (en ? 'Sing this degree' : 'Cante este grau')}
        </div>
        <div className={`text-6xl font-black display ${phase === 'sing' ? 'text-violet-300' : 'text-slate-600'}`}>
          {degreeIdx + 1}
        </div>
        <div className={`text-2xl font-bold mt-1 ${phase === 'sing' ? 'text-fuchsia-300' : 'text-slate-600'}`}>
          {solf[degreeIdx]}
        </div>
        {round && phase === 'sing' && (
          <div className="text-xs text-slate-500 mt-2">{en ? 'target' : 'alvo'}: {midiToNoteName(round.targetMidi)}</div>
        )}
      </div>

      {/* régua dos 7 graus — clique para ouvir */}
      <div className="grid grid-cols-7 gap-1">
        {solf.map((s, i) => (
          <button
            key={i}
            onClick={async () => { if (round) { await ensureAudioStarted(); playNote(round.scale[i], 450, 0, a4); } }}
            className={`py-2 rounded-lg border text-center transition-all ${
              i === degreeIdx && phase === 'sing'
                ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-200'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-sm font-bold">{i + 1}</div>
            <div className="text-[9px]">{s}</div>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button onClick={replayTonic} className="btn-secondary text-xs px-4 py-2">🔊 {en ? 'Replay key' : 'Tocar tônica'}</button>
      </div>

      <TuneMeter cents={phase === 'sing' ? sing.liveCents : null} level={sing.micLevel} />

      {!sing.isListening && (
        <p className="text-center text-xs text-rose-300/80">🎙️ {en ? 'Allow the microphone to play.' : 'Permita o microfone para jogar.'}</p>
      )}
    </GameShell>
  );
}
