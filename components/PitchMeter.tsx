import { useRef, useEffect } from 'react';
import type { PitchFrame } from '../types';

// ──────────────────────────────────────────────────────────────────────────
// PitchMeter — the visual heart of MasterSinger.
//
// Shows, in one glance:
//   • The TARGET note (when practicing) vs the note you're SINGING
//   • A big cents gauge with a needle that snaps to center when in tune
//   • Clear ALTO ↑ / BAIXO ↓ arrows so you instantly know which way to move
//   • A color-coded ring (green = in tune, amber = close, red = off)
//   • A scrolling pitch trace so you can SEE your pitch over time
//
// Used by both the Tuner (no target) and the Practice screen (with target).
// ──────────────────────────────────────────────────────────────────────────

interface PitchMeterProps {
  frame: PitchFrame | null;
  targetMidi?: number;        // optional target note (practice mode)
  targetLabel?: string;       // e.g. "C4"
  isListening: boolean;
  size?: 'sm' | 'lg';
  lang: 'pt-BR' | 'en';
}

const PITCH_GOOD = 10;   // ±10 cents = green
const PITCH_WARN = 25;   // ±25 cents = amber

function pitchColor(cents: number): { ring: string; text: string; hex: string } {
  const a = Math.abs(cents);
  if (a < PITCH_GOOD) return { ring: '#22c55e', text: 'text-green-400', hex: '#22c55e' };
  if (a < PITCH_WARN) return { ring: '#f59e0b', text: 'text-amber-400', hex: '#f59e0b' };
  return { ring: '#ef4444', text: 'text-red-400', hex: '#ef4444' };
}

export function PitchMeter({
  frame,
  targetMidi,
  targetLabel,
  isListening,
  lang,
}: PitchMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]); // cents history, NaN for silence

  const voiced = isListening && frame && frame.frequency > 0 && frame.confidence > 0.35;
  const cents = voiced ? frame!.cents : 0;
  const noteName = voiced ? frame!.noteName : '—';
  const freq = voiced ? frame!.frequency : 0;
  const col = pitchColor(cents);
  const inTune = voiced && Math.abs(cents) < PITCH_GOOD;

  // ── Direction indicator: sharp = ALTO (sing lower), flat = BAIXO (sing higher) ──
  // Positive cents → pitch is ABOVE the target → "ALTO ↑" (sing down)
  // Negative cents → pitch is BELOW the target → "BAIXO ↓" (sing up)
  let dir: 'sharp' | 'flat' | 'none' = 'none';
  if (voiced) dir = cents > PITCH_GOOD ? 'sharp' : cents < -PITCH_GOOD ? 'flat' : 'none';

  // target vs sung delta (in semitones, for the "match" indicator)
  let matchDelta: number | null = null;
  if (voiced && targetMidi != null) {
    matchDelta = Math.round(frame!.midi) - targetMidi; // semitones off
  }

  // ── Scrolling pitch trace on canvas ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const history = historyRef.current;
    history.push(voiced ? cents : NaN);
    if (history.length > 180) history.shift();

    ctx.clearRect(0, 0, w, h);

    // grid every 25 cents
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let c = -50; c <= 50; c += 25) {
      const y = h / 2 - (c / 50) * (h / 2 - 6);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // center line (in-tune)
    ctx.strokeStyle = 'rgba(34,197,94,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // the trace
    const pts: { x: number; y: number; c: number }[] = [];
    history.forEach((c, i) => {
      if (Number.isNaN(c)) return;
      const x = (i / (history.length - 1 || 1)) * w;
      const y = h / 2 - (Math.max(-50, Math.min(50, c)) / 50) * (h / 2 - 6);
      pts.push({ x, y, c });
    });
    if (pts.length > 1) {
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      for (let i = 1; i < pts.length; i++) {
        const pc = pitchColor(pts[i].c);
        ctx.strokeStyle = pc.hex + 'cc';
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      // glowing head dot
      const last = pts[pts.length - 1];
      const pc = pitchColor(last.c);
      ctx.fillStyle = pc.hex;
      ctx.shadowColor = pc.hex;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [frame, voiced, cents]);

  const L = (pt: string, en: string) => (lang === 'pt-BR' ? pt : en);

  return (
    <div className="card p-6 space-y-4">
      {/* ── Target vs Sung ── */}
      {targetMidi != null && (
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">
              {L('Alvo', 'Target')}
            </div>
            <div className="text-3xl font-black font-mono text-violet-300">
              {targetLabel ?? '—'}
            </div>
          </div>
          <div className="text-slate-600 text-2xl">→</div>
          <div className="text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">
              {L('Você', 'You')}
            </div>
            <div className={`text-3xl font-black font-mono ${voiced ? col.text : 'text-slate-600'} ${inTune ? 'pulse-soft' : ''}`}>
              {voiced ? noteName : '—'}
            </div>
          </div>
          {voiced && matchDelta != null && (
            <div className={`text-xs font-mono px-2 py-1 rounded-lg ${matchDelta === 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              {matchDelta === 0 ? '✓' : matchDelta > 0 ? `+${matchDelta}` : matchDelta}
            </div>
          )}
        </div>
      )}

      {/* ── Big note + ring (tuner mode, no target) ── */}
      {targetMidi == null && (
        <div className="text-center">
          <div className={`text-7xl font-black font-mono ${voiced ? col.text : 'text-slate-600'} ${inTune ? 'pulse-soft' : ''}`}>
            {voiced ? noteName : '—'}
          </div>
          <div className="text-sm text-slate-400 font-mono mt-1">
            {voiced ? `${freq.toFixed(1)} Hz` : L('Sem sinal — cante ou assovie', 'No signal — sing or hum')}
          </div>
        </div>
      )}

      {/* ── Direction arrows (ALTO/BAIXO) ── */}
      {voiced && dir !== 'none' && (
        <div className="flex items-center justify-center gap-3">
          {dir === 'sharp' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/15 border border-red-500/30">
              <span className="text-2xl font-black text-red-400">↑</span>
              <span className="text-sm font-bold text-red-300 uppercase tracking-wider font-mono">
                {L('Alto — abaixe', 'Sharp — go lower')}
              </span>
            </div>
          )}
          {dir === 'flat' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/30">
              <span className="text-2xl font-black text-amber-400">↓</span>
              <span className="text-sm font-bold text-amber-300 uppercase tracking-wider font-mono">
                {L('Baixo — suba', 'Flat — go higher')}
              </span>
            </div>
          )}
        </div>
      )}
      {voiced && dir === 'none' && (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/15 border border-green-500/30">
            <span className="text-2xl">✓</span>
            <span className="text-sm font-bold text-green-300 uppercase tracking-wider font-mono">
              {L('Afinado!', 'In tune!')}
            </span>
          </div>
        </div>
      )}

      {/* ── Cents gauge (big) ── */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">{L('Cents', 'Cents')}</span>
          <span className={`text-2xl font-black font-mono ${voiced ? col.text : 'text-slate-600'}`}>
            {voiced ? `${cents > 0 ? '+' : ''}${cents}` : '0'}
          </span>
        </div>
        <div className="relative h-5 rounded-full gauge-bg overflow-hidden">
          {/* needle */}
          <div
            className="absolute top-0 bottom-0 w-1.5 bg-white shadow-lg"
            style={{
              left: `${Math.max(0, Math.min(100, ((cents + 50) / 100) * 100))}%`,
              transform: 'translateX(-50%)',
              transition: 'left 40ms linear',
            }}
          />
          {/* center mark */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-white/50" style={{ left: '50%', transform: 'translateX(-50%)' }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>-50</span><span>-25</span><span>0</span><span>+25</span><span>+50</span>
        </div>
      </div>

      {/* ── Scrolling pitch trace ── */}
      <div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mb-1">
          {L('Seu traço de afinação', 'Your pitch trace')}
        </div>
        <canvas ref={canvasRef} className="w-full h-28" />
      </div>
    </div>
  );
}
