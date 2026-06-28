/**
 * useSingThrough — engine de canto sequencial compartilhada pelos jogos de voz.
 *
 * Recebe uma lista de notas-alvo (MIDI) e, conforme o usuário canta, casa cada
 * alvo na ORDEM, com equivalência de oitava e tolerância calibrada para voz.
 * Um alvo só conta quando é SUSTENTADO na faixa boa por HOLD_MS — evita que um
 * glissando dispare falsos acertos ao passar pela nota.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePitchDetection } from '../../audio/usePitchDetection';
import type { PitchFrame } from '../../types';
import {
  centsOffOctaveEquiv,
  CENTS_PERFECT,
  CENTS_GOOD,
  HOLD_MS,
  ADVANCE_DEBOUNCE_MS,
} from '../../data/games';

export type HitQuality = 'perfect' | 'good';

interface Options {
  a4: number;
  micSensitivity?: number;
  noiseGate?: number;
  /** false = ignora o microfone (ex.: enquanto a referência toca) */
  active: boolean;
  /** chamado a cada alvo acertado: índice acertado + qualidade */
  onHit?: (idx: number, quality: HitQuality, bestCents: number) => void;
  /** chamado quando todos os alvos foram acertados */
  onComplete?: () => void;
}

interface SingThroughReturn {
  idx: number;
  isListening: boolean;
  micLevel: number;
  /** cents do alvo atual neste instante (null = silêncio/sem voz) */
  liveCents: number | null;
  currentFrame: PitchFrame | null;
  lastQuality: HitQuality | null;
  start: () => Promise<void>;
  stop: () => void;
  /** reinicia o progresso para uma nova lista de alvos */
  reset: () => void;
}

export function useSingThrough(targets: number[], opts: Options): SingThroughReturn {
  const { a4, micSensitivity = 0.6, noiseGate = 0.01, active, onHit, onComplete } = opts;

  const [idx, setIdx] = useState(0);
  const [liveCents, setLiveCents] = useState<number | null>(null);
  const [lastQuality, setLastQuality] = useState<HitQuality | null>(null);

  // refs para evitar stale closures dentro do onFrame
  const idxRef = useRef(0);
  const targetsRef = useRef<number[]>(targets);
  const activeRef = useRef(active);
  const holdStartRef = useRef<number>(0);
  const bestCentsRef = useRef<number>(999);
  const lastAdvanceRef = useRef<number>(0);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { targetsRef.current = targets; }, [targets]);
  useEffect(() => { idxRef.current = idx; }, [idx]);

  const onHitRef = useRef(onHit);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onHitRef.current = onHit; }, [onHit]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const handleFrame = useCallback((frame: PitchFrame) => {
    if (!activeRef.current) { setLiveCents(null); return; }
    const tgts = targetsRef.current;
    const i = idxRef.current;
    if (i >= tgts.length) return;

    // sem voz confiável → reseta o "hold"
    if (frame.frequency <= 0 || frame.confidence < 0.35) {
      holdStartRef.current = 0;
      bestCentsRef.current = 999;
      setLiveCents(null);
      return;
    }

    const off = centsOffOctaveEquiv(frame.midi, tgts[i]);
    setLiveCents(off);

    const now = frame.timestamp || performance.now();
    if (now - lastAdvanceRef.current < ADVANCE_DEBOUNCE_MS) return;

    if (off <= CENTS_GOOD) {
      if (holdStartRef.current === 0) holdStartRef.current = now;
      bestCentsRef.current = Math.min(bestCentsRef.current, off);
      if (now - holdStartRef.current >= HOLD_MS) {
        // acerto confirmado
        const quality: HitQuality = bestCentsRef.current <= CENTS_PERFECT ? 'perfect' : 'good';
        const best = bestCentsRef.current;
        lastAdvanceRef.current = now;
        holdStartRef.current = 0;
        bestCentsRef.current = 999;
        setLastQuality(quality);
        onHitRef.current?.(i, quality, best);
        const next = i + 1;
        idxRef.current = next;
        setIdx(next);
        if (next >= tgts.length) {
          onCompleteRef.current?.();
        }
      }
    } else {
      // saiu da faixa antes de completar o hold
      holdStartRef.current = 0;
      bestCentsRef.current = 999;
    }
  }, []);

  const pitch = usePitchDetection({
    a4,
    micSensitivity,
    noiseGate,
    smoothing: true,
    minConfidence: 0.2,
    onFrame: handleFrame,
  });

  const reset = useCallback(() => {
    idxRef.current = 0;
    holdStartRef.current = 0;
    bestCentsRef.current = 999;
    lastAdvanceRef.current = 0;
    setIdx(0);
    setLiveCents(null);
    setLastQuality(null);
  }, []);

  return {
    idx,
    isListening: pitch.isListening,
    micLevel: pitch.micLevel,
    liveCents,
    currentFrame: pitch.currentFrame,
    lastQuality,
    start: pitch.start,
    stop: pitch.stop,
    reset,
  };
}
