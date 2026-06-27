import { useRef, useEffect } from 'react';
import type { ExerciseTarget, PitchFrame } from '../types';
import { midiToNoteName } from '../services/theoryService';
import { playNote, ensureAudioStarted } from '../services/audioService';

// ──────────────────────────────────────────────────────────────────────────
// PitchHighway — the karaoke-style "note highway" that makes MasterSinger feel
// like a game. Target notes scroll right-to-left as horizontal bars on a
// pitch/time grid; a fixed playhead marks "now"; the singer's live pitch is a
// glowing dot with a trail. Bars light GREEN when hit, RED when missed.
//
// Two modes:
//   • live (default): scrolling, rAF clock = performance.now() − startTime,
//     live pitch tracking + scoring handoff via onFinish.
//   • preview: the whole melody laid out static across the width. No mic, no
//     scoring — just tap a note to hear it (and a button to play them all).
//
// In both modes every drawn bar is clickable to hear that note.
// ──────────────────────────────────────────────────────────────────────────

interface PitchHighwayProps {
  targets: ExerciseTarget[];
  frame?: PitchFrame | null;
  startTime?: number;     // performance.now() origin (live mode)
  running?: boolean;
  a4: number;
  preview?: boolean;
  onFinish?: () => void;
}

type Status = 'pending' | 'hit' | 'miss';

// Octave-equivalent match: singing the right pitch class in ANY comfortable
// octave counts as on-note (mirrors the scoring engine's octave equivalence).
function onPitch(userMidi: number, targetMidi: number): boolean {
  const semis = Math.abs(userMidi - targetMidi) % 12;
  return Math.min(semis, 12 - semis) <= HIT_TOLERANCE;
}
type BarRect = { x0: number; x1: number; yTop: number; yBot: number; midi: number };
const HIT_TOLERANCE = 0.6;       // semitones counted as "on the note"
const WINDOW_MS = 4000;          // how far ahead is visible (live mode)
const END_BUFFER_MS = 700;

export function PitchHighway({ targets, frame = null, startTime = 0, running = false, a4, preview = false, onFinish }: PitchHighwayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<PitchFrame | null>(frame);
  const startRef = useRef(startTime);
  const runningRef = useRef(running);
  const onFinishRef = useRef(onFinish);
  const finishedRef = useRef(false);
  const statusRef = useRef<Status[]>(targets.map(() => 'pending'));
  const trailRef = useRef<{ t: number; midi: number }[]>([]);
  const barsRef = useRef<BarRect[]>([]);

  useEffect(() => { frameRef.current = frame; }, [frame]);
  useEffect(() => { startRef.current = startTime; }, [startTime]);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { onFinishRef.current = onFinish; }, [onFinish]);
  useEffect(() => { statusRef.current = targets.map(() => 'pending'); finishedRef.current = false; trailRef.current = []; }, [targets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const midis = targets.map(t => t.midi);
    const lo = Math.min(...midis) - 3;
    const hi = Math.max(...midis) + 3;
    const firstStart = targets[0]?.startMs ?? 0;
    const totalEnd = Math.max(...targets.map(t => t.startMs + t.durationMs));
    const endMs = totalEnd + END_BUFFER_MS;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const drawBar = (x0: number, x1: number, midi: number, fill: string, stroke: string, yFor: (m: number) => number) => {
      const y = yFor(midi);
      const barH = 16;
      const r = barH / 2;
      const xx0 = Math.max(0, x0), xx1 = Math.min(canvas.clientWidth, x1);
      ctx.beginPath();
      ctx.roundRect(xx0, y - r, Math.max(3, xx1 - xx0), barH, r);
      ctx.fillStyle = fill; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke();
      return { x0: xx0, x1: xx1, yTop: y - r, yBot: y + r, midi };
    };

    const draw = () => {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      const topM = 8, botM = 8;
      const yFor = (m: number) => topM + (1 - (m - lo) / (hi - lo)) * (H - topM - botM);
      const uniqueMidis = [...new Set(midis)].sort((a, b) => a - b);
      const bars: BarRect[] = [];
      ctx.clearRect(0, 0, W, H);

      // pitch gridlines + note labels
      ctx.font = '10px ui-monospace, monospace';
      for (const m of uniqueMidis) {
        const y = yFor(m);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillStyle = 'rgba(148,163,184,0.55)';
        ctx.fillText(midiToNoteName(m), 4, y - 3);
      }

      if (preview) {
        // ── Static: lay the whole melody across the width ──
        const leftPad = 30, rightPad = 12;
        const span = Math.max(1, totalEnd - firstStart);
        const xFor = (ms: number) => leftPad + ((ms - firstStart) / span) * (W - leftPad - rightPad);
        targets.forEach((tg) => {
          bars.push(drawBar(xFor(tg.startMs), xFor(tg.startMs + tg.durationMs), tg.midi,
            'rgba(139,92,246,0.4)', 'rgba(139,92,246,0.85)', yFor));
        });
        barsRef.current = bars;
        raf = requestAnimationFrame(draw);
        return;
      }

      // ── Live scrolling ──
      const playheadX = W * 0.26;
      const pxPerMs = (W - playheadX) / WINDOW_MS;
      const elapsed = performance.now() - startRef.current;
      const userMidi = frameRef.current && frameRef.current.frequency > 0 ? frameRef.current.midi : null;
      const voiced = userMidi != null && (frameRef.current?.confidence ?? 0) > 0.2;

      targets.forEach((tg, i) => {
        const x0 = playheadX + (tg.startMs - elapsed) * pxPerMs;
        const x1 = playheadX + (tg.startMs + tg.durationMs - elapsed) * pxPerMs;
        if (x1 < 0 || x0 > W) {
          if (elapsed > tg.startMs + tg.durationMs && statusRef.current[i] === 'pending') statusRef.current[i] = 'miss';
          return;
        }
        const active = elapsed >= tg.startMs && elapsed <= tg.startMs + tg.durationMs;
        if (active && voiced && onPitch(userMidi!, tg.midi)) statusRef.current[i] = 'hit';
        else if (elapsed > tg.startMs + tg.durationMs && statusRef.current[i] === 'pending') statusRef.current[i] = 'miss';

        const status = statusRef.current[i];
        let fill = 'rgba(139,92,246,0.35)', stroke = 'rgba(139,92,246,0.7)';
        if (status === 'hit') { fill = 'rgba(34,197,94,0.55)'; stroke = 'rgba(34,197,94,0.95)'; }
        else if (status === 'miss') { fill = 'rgba(239,68,68,0.30)'; stroke = 'rgba(239,68,68,0.6)'; }
        else if (active) { fill = 'rgba(34,211,238,0.45)'; stroke = 'rgba(34,211,238,0.95)'; }
        bars.push(drawBar(x0, x1, tg.midi, fill, stroke, yFor));
      });
      barsRef.current = bars;

      // playhead
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(playheadX, 0); ctx.lineTo(playheadX, H); ctx.stroke();

      // live pitch trail
      if (voiced) trailRef.current.push({ t: elapsed, midi: userMidi! });
      trailRef.current = trailRef.current.filter(p => elapsed - p.t < 1600);
      if (trailRef.current.length > 1) {
        ctx.beginPath();
        trailRef.current.forEach((p, idx) => {
          const x = playheadX + (p.t - elapsed) * pxPerMs;
          const y = yFor(p.midi);
          idx === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.strokeStyle = 'rgba(34,211,238,0.5)'; ctx.lineWidth = 2; ctx.stroke();
      }

      // live pitch dot
      if (voiced) {
        const y = yFor(userMidi!);
        const onNote = targets.some(tg => elapsed >= tg.startMs && elapsed <= tg.startMs + tg.durationMs && onPitch(userMidi!, tg.midi));
        ctx.beginPath();
        ctx.arc(playheadX, y, onNote ? 9 : 6, 0, Math.PI * 2);
        ctx.fillStyle = onNote ? '#22c55e' : '#22d3ee';
        ctx.shadowColor = onNote ? '#22c55e' : '#22d3ee';
        ctx.shadowBlur = onNote ? 18 : 8;
        ctx.fill(); ctx.shadowBlur = 0;
      }

      // count-in
      if (elapsed < firstStart && elapsed >= 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '700 64px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(Math.ceil((firstStart - elapsed) / 1000)), W / 2, H / 2 + 22);
        ctx.textAlign = 'left';
      }

      if (runningRef.current && !finishedRef.current && elapsed >= endMs) {
        finishedRef.current = true;
        onFinishRef.current?.();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [targets, a4, preview]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const hit = barsRef.current.find(b => x >= b.x0 && x <= b.x1 && y >= b.yTop - 6 && y <= b.yBot + 6);
    if (hit) { ensureAudioStarted().then(() => playNote(hit.midi, 650, 0, a4)); }
  };

  return <canvas ref={canvasRef} onClick={handleClick} className="w-full rounded-2xl bg-slate-950/60 border border-white/5 cursor-pointer" style={{ height: 340 }} />;
}
