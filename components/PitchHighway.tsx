import { useRef, useEffect } from 'react';
import type { ExerciseTarget, PitchFrame } from '../types';
import { midiToNoteName } from '../services/theoryService';

// ──────────────────────────────────────────────────────────────────────────
// PitchHighway — the karaoke-style "note highway" that makes MasterSinger feel
// like a game. Target notes scroll right-to-left as horizontal bars on a
// pitch/time grid; a fixed playhead marks "now"; the singer's live pitch is a
// glowing dot with a trail. Bars light GREEN when hit, RED when missed.
//
// Self-contained: it runs its own requestAnimationFrame loop and reads the
// latest props from refs, so it redraws at full frame rate without re-rendering
// React. The clock is performance.now() − startTime, aligned with the pitch
// hook's frame timestamps so the visuals match the scoring.
// ──────────────────────────────────────────────────────────────────────────

interface PitchHighwayProps {
  targets: ExerciseTarget[];
  frame: PitchFrame | null;
  startTime: number;     // performance.now() origin
  running: boolean;
  a4: number;
  onFinish: () => void;
}

type Status = 'pending' | 'hit' | 'miss';
const HIT_TOLERANCE = 0.6;       // semitones counted as "on the note"
const WINDOW_MS = 4000;          // how far ahead is visible
const END_BUFFER_MS = 700;

export function PitchHighway({ targets, frame, startTime, running, a4, onFinish }: PitchHighwayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<PitchFrame | null>(frame);
  const startRef = useRef(startTime);
  const runningRef = useRef(running);
  const onFinishRef = useRef(onFinish);
  const finishedRef = useRef(false);
  const statusRef = useRef<Status[]>(targets.map(() => 'pending'));
  const trailRef = useRef<{ t: number; midi: number }[]>([]);

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
    const endMs = Math.max(...targets.map(t => t.startMs + t.durationMs)) + END_BUFFER_MS;
    const uniqueMidis = [...new Set(midis)].sort((a, b) => a - b);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      const topM = 8, botM = 8;
      const playheadX = W * 0.26;
      const pxPerMs = (W - playheadX) / WINDOW_MS;
      const yFor = (m: number) => topM + (1 - (m - lo) / (hi - lo)) * (H - topM - botM);
      const elapsed = performance.now() - startRef.current;

      ctx.clearRect(0, 0, W, H);

      // pitch gridlines + note labels for each target pitch
      ctx.font = '10px ui-monospace, monospace';
      for (const m of uniqueMidis) {
        const y = yFor(m);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillStyle = 'rgba(148,163,184,0.55)';
        ctx.fillText(midiToNoteName(m), 4, y - 3);
      }

      // target bars
      const userMidi = frameRef.current && frameRef.current.frequency > 0 ? frameRef.current.midi : null;
      const voiced = userMidi != null && (frameRef.current?.confidence ?? 0) > 0.3;
      targets.forEach((tg, i) => {
        const x0 = playheadX + (tg.startMs - elapsed) * pxPerMs;
        const x1 = playheadX + (tg.startMs + tg.durationMs - elapsed) * pxPerMs;
        if (x1 < 0 || x0 > W) {
          // still update status if its window just passed
          if (elapsed > tg.startMs + tg.durationMs && statusRef.current[i] === 'pending') statusRef.current[i] = 'miss';
          return;
        }
        const active = elapsed >= tg.startMs && elapsed <= tg.startMs + tg.durationMs;
        if (active && voiced && Math.abs(userMidi! - tg.midi) <= HIT_TOLERANCE) statusRef.current[i] = 'hit';
        else if (elapsed > tg.startMs + tg.durationMs && statusRef.current[i] === 'pending') statusRef.current[i] = 'miss';

        const status = statusRef.current[i];
        const y = yFor(tg.midi);
        const barH = 16;
        let fill = 'rgba(139,92,246,0.35)';            // upcoming (violet)
        let stroke = 'rgba(139,92,246,0.7)';
        if (status === 'hit') { fill = 'rgba(34,197,94,0.55)'; stroke = 'rgba(34,197,94,0.95)'; }
        else if (status === 'miss') { fill = 'rgba(239,68,68,0.30)'; stroke = 'rgba(239,68,68,0.6)'; }
        else if (active) { fill = 'rgba(34,211,238,0.45)'; stroke = 'rgba(34,211,238,0.95)'; }

        const r = barH / 2;
        const xx0 = Math.max(0, x0), xx1 = Math.min(W, x1);
        ctx.beginPath();
        ctx.roundRect(xx0, y - r, Math.max(2, xx1 - xx0), barH, r);
        ctx.fillStyle = fill; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke();
      });

      // playhead
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 2;
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

      // live pitch dot at the playhead
      if (voiced) {
        const y = yFor(userMidi!);
        // is the user on the currently active target?
        const onNote = targets.some(tg => elapsed >= tg.startMs && elapsed <= tg.startMs + tg.durationMs && Math.abs(userMidi! - tg.midi) <= HIT_TOLERANCE);
        ctx.beginPath();
        ctx.arc(playheadX, y, onNote ? 9 : 6, 0, Math.PI * 2);
        ctx.fillStyle = onNote ? '#22c55e' : '#22d3ee';
        ctx.shadowColor = onNote ? '#22c55e' : '#22d3ee';
        ctx.shadowBlur = onNote ? 18 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // count-in (first target starts at ~1000ms; show 3-2-1 before it)
      const firstStart = targets[0]?.startMs ?? 0;
      if (elapsed < firstStart && elapsed >= 0) {
        const secsLeft = Math.ceil((firstStart - elapsed) / 1000);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '700 64px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(secsLeft), W / 2, H / 2 + 22);
        ctx.textAlign = 'left';
      }

      if (runningRef.current && !finishedRef.current && elapsed >= endMs) {
        finishedRef.current = true;
        onFinishRef.current();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [targets, a4]);

  return <canvas ref={canvasRef} className="w-full rounded-2xl bg-slate-950/60 border border-white/5" style={{ height: 340 }} />;
}
