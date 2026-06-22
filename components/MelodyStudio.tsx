import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { framesToNotes, notesToMidiBlob, downloadBlob } from '../services/midiService';
import { playNote, ensureAudioStarted, stopAll } from '../services/audioService';
import { midiToNoteName } from '../services/theoryService';
import type { Note, PitchFrame } from '../types';

type Tool = 'select' | 'draw' | 'erase';

// ── Piano roll geometry (mobile-first) ──
const ROW_HEIGHT = 40;       // px per semitone — fat enough to tap/drag on a phone
const PX_PER_SEC = 90;       // horizontal zoom
const PIANO_W = 54;          // pinned left keyboard column
// Fallback range shown before any recording / when the roll is empty.
const FALLBACK_LOW = 48;     // C3
const FALLBACK_HIGH = 72;    // C5 — a comfortable singing window, not the whole C3–C6
const MIN_ROWS = 13;         // never auto-zoom tighter than ~an octave + a bit
const MARGIN_SEMITONES = 3;  // headroom above/below the detected notes
const RESIZE_HANDLE_PX = 18; // touch-friendly right-edge grab zone (was 8 — too small)
const SNAP_MS = 50;          // free-edit grid
const QUANT_MS = 250;        // quantize grid (1/4 @ 60bpm)
const MIN_NOTE_MS = 80;

export function MelodyStudio() {
  const { profile, unlockBadge } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;

  const [notes, setNotes] = useState<Note[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tool, setTool] = useState<Tool>('select');
  const [quantize, setQuantize] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playheadMs, setPlayheadMs] = useState(0);
  const [selectedNote, setSelectedNote] = useState<number | null>(null);
  const [liveNote, setLiveNote] = useState('');
  const [liveCents, setLiveCents] = useState(0);
  const [drag, setDrag] = useState<null | {
    kind: 'move' | 'resize' | 'create';
    noteIdx: number;
    startX: number; startY: number;
    orig: Note;
    createMidi?: number; createStart?: number;
  }>(null);

  const framesRef = useRef<PitchFrame[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<number | null>(null);

  const pitch = usePitchDetection({
    a4,
    smoothing: false,   // raw frames: let framesToNotes own the smoothing so
                        // note timestamps line up with real time.
    onFrame: (frame) => {
      framesRef.current.push(frame);
      if (frame.frequency > 0) {
        setLiveNote(frame.noteName);
        setLiveCents(frame.cents);
      }
    },
  });

  // ── Auto-fit the vertical range to the detected notes (+ margin), with a
  //    sensible fallback when there's nothing to show yet. Recomputes whenever
  //    the notes change so the roll always hugs what you sang. ──
  const { lowMidi, highMidi, rows } = (() => {
    if (notes.length === 0) {
      return { lowMidi: FALLBACK_LOW, highMidi: FALLBACK_HIGH, rows: FALLBACK_HIGH - FALLBACK_LOW + 1 };
    }
    let lo = Infinity, hi = -Infinity;
    for (const n of notes) { if (n.midi < lo) lo = n.midi; if (n.midi > hi) hi = n.midi; }
    lo -= MARGIN_SEMITONES; hi += MARGIN_SEMITONES;
    if (hi - lo + 1 < MIN_ROWS) {
      const pad = Math.ceil((MIN_ROWS - (hi - lo + 1)) / 2);
      lo -= pad; hi += pad;
    }
    return { lowMidi: lo, highMidi: hi, rows: hi - lo + 1 };
  })();

  const snap = (ms: number) => {
    const g = quantize ? QUANT_MS : SNAP_MS;
    return Math.round(ms / g) * g;
  };

  // ── Coordinate mapping (scroll-safe via getBoundingClientRect) ──
  const toCoords = (e: React.PointerEvent | React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tMs = (x / PX_PER_SEC) * 1000;
    const midi = highMidi - Math.floor(y / ROW_HEIGHT);
    return { tMs, midi, x, y };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = rows * ROW_HEIGHT;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, w, h);

    // background rows (black/white keys)
    for (let m = lowMidi; m <= highMidi; m++) {
      const y = (highMidi - m) * ROW_HEIGHT;
      const pc = ((m % 12) + 12) % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(pc);
      ctx.fillStyle = isBlack ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.055)';
      ctx.fillRect(PIANO_W, y, w - PIANO_W, ROW_HEIGHT);
      if (pc === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(PIANO_W, y, w - PIANO_W, 1);
      }
    }

    // time grid
    const visibleSec = (w - PIANO_W) / PX_PER_SEC;
    for (let s = 0; s <= visibleSec + 1; s += 0.5) {
      const x = PIANO_W + s * PX_PER_SEC;
      ctx.strokeStyle = s % 1 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    // pinned keyboard column
    ctx.fillStyle = 'rgba(10,10,20,0.96)';
    ctx.fillRect(0, 0, PIANO_W, h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(PIANO_W - 1, 0, 1, h);
    for (let m = lowMidi; m <= highMidi; m++) {
      const y = (highMidi - m) * ROW_HEIGHT;
      const pc = ((m % 12) + 12) % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(pc);
      ctx.fillStyle = isBlack ? '#0e0e1a' : '#1b1b2c';
      ctx.fillRect(0, y, PIANO_W - 1, ROW_HEIGHT);
      if (pc === 0) {
        ctx.fillStyle = '#c4b5fd';
        ctx.font = '600 11px JetBrains Mono';
        ctx.fillText(midiToNoteName(m), 6, y + ROW_HEIGHT - 9);
      }
    }

    // notes
    notes.forEach((note, idx) => {
      const x = PIANO_W + (note.startTime / 1000) * PX_PER_SEC;
      const w2 = Math.max(8, ((note.endTime - note.startTime) / 1000) * PX_PER_SEC);
      const y = (highMidi - note.midi) * ROW_HEIGHT;
      const isSel = idx === selectedNote;
      const color = Math.abs(note.cents) < 10 ? '#22c55e' : Math.abs(note.cents) < 25 ? '#f59e0b' : '#7c3aed';
      ctx.globalAlpha = Math.max(0.6, note.confidence);
      ctx.fillStyle = isSel ? '#67e8f9' : color;
      roundRect(ctx, x, y + 3, w2, ROW_HEIGHT - 6, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isSel ? '#fff' : 'rgba(0,0,0,0.45)';
      ctx.lineWidth = isSel ? 2 : 1;
      roundRect(ctx, x, y + 3, w2, ROW_HEIGHT - 6, 6);
      ctx.stroke();
      // resize handle hint on selected note (fat, touch-friendly)
      if (isSel) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(x + w2 - 5, y + 6, 3, ROW_HEIGHT - 12);
      }
    });

    // playhead
    if (isPlaying || playheadMs > 0) {
      const x = PIANO_W + (playheadMs / 1000) * PX_PER_SEC;
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(x, 0, 2, h);
    }
  }, [notes, isPlaying, playheadMs, selectedNote, quantize, lowMidi, highMidi, rows]);

  useEffect(() => { draw(); }, [draw]);

  // redraw on resize so the responsive canvas stays sharp
  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [draw]);

  // ── Recording ──
  const handleRecord = async () => {
    if (isRecording) {
      pitch.stop();
      const frames = framesRef.current;
      const detected = framesToNotes(frames, a4);
      setNotes(detected);
      setDuration(frames.length > 0 ? frames[frames.length - 1].timestamp : 0);
      setSelectedNote(null);
      setLiveNote('');
      setIsRecording(false);
      if (detected.length > 0 && !profile.badges.includes('first-studio')) {
        unlockBadge('first-studio');
      }
      return;
    }
    framesRef.current = [];
    setNotes([]);
    setDuration(0);
    setSelectedNote(null);
    setLiveNote('');
    setIsRecording(true);
    await pitch.start();
  };

  // ── Playback (Tone-scheduled = sample-accurate; rAF only drives the playhead) ──
  const handlePlay = async () => {
    if (notes.length === 0) return;
    await ensureAudioStarted();
    setIsPlaying(true);
    setPlayheadMs(0);
    const startT = performance.now();
    const totalMs = Math.max(...notes.map(n => n.endTime));

    notes.forEach(note => {
      playNote(note.midi, Math.max(120, note.endTime - note.startTime), note.startTime, a4);
    });

    const tick = () => {
      const elapsed = performance.now() - startT;
      setPlayheadMs(elapsed);
      if (elapsed < totalMs + 250) {
        playTimerRef.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
        setPlayheadMs(0);
      }
    };
    playTimerRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (playTimerRef.current) cancelAnimationFrame(playTimerRef.current);
    stopAll();
  }, []);

  // ── Pointer interactions ──
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isRecording || isPlaying) return;
    const { tMs, midi } = toCoords(e);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

    if (tool === 'erase') {
      setNotes(prev => prev.filter(n => !(tMs >= n.startTime && tMs <= n.endTime && midi === n.midi)));
      return;
    }

    if (tool === 'draw') {
      const start = snap(Math.max(0, tMs));
      const clamped = Math.max(lowMidi, Math.min(highMidi, midi));
      const newNote: Note = {
        startTime: start, endTime: start + QUANT_MS,
        midi: clamped,
        frequency: a4 * Math.pow(2, (clamped - 69) / 12),
        cents: 0, velocity: 90, confidence: 1,
      };
      setNotes(prev => [...prev, newNote].sort((a, b) => a.startTime - b.startTime));
      setDrag({ kind: 'create', noteIdx: -1, startX: tMs, startY: midi, orig: newNote, createMidi: newNote.midi, createStart: start });
      return;
    }

    // select tool: hit-test
    let hitIdx = -1;
    let onHandle = false;
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      const x0 = PIANO_W + (n.startTime / 1000) * PX_PER_SEC;
      const x1 = PIANO_W + (n.endTime / 1000) * PX_PER_SEC;
      const y0 = (highMidi - n.midi) * ROW_HEIGHT;
      const rx = PIANO_W + (tMs / 1000) * PX_PER_SEC;
      const ry = (highMidi - midi) * ROW_HEIGHT;
      if (rx >= x0 && rx <= x1 && ry >= y0 && ry <= y0 + ROW_HEIGHT) {
        hitIdx = i;
        onHandle = rx >= x1 - RESIZE_HANDLE_PX;
        break;
      }
    }
    setSelectedNote(hitIdx >= 0 ? hitIdx : null);
    if (hitIdx >= 0) {
      setDrag({
        kind: onHandle ? 'resize' : 'move',
        noteIdx: hitIdx, startX: tMs, startY: midi,
        orig: { ...notes[hitIdx] },
      });
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag) return;
    const { tMs, midi } = toCoords(e);
    if (drag.kind === 'create') {
      const end = snap(Math.max(drag.createStart! + MIN_NOTE_MS, tMs));
      setNotes(prev => prev.map((n, i) =>
        i === prev.length - 1 && n.startTime === drag.createStart ? { ...n, endTime: end } : n
      ));
      return;
    }
    if (drag.kind === 'move') {
      const dMidi = midi - drag.startY;
      const dMs = snap(tMs) - snap(drag.startX);
      setNotes(prev => prev.map((n, i) => i === drag.noteIdx ? {
        ...n,
        midi: Math.max(lowMidi, Math.min(highMidi, drag.orig.midi + dMidi)),
        startTime: Math.max(0, drag.orig.startTime + dMs),
        endTime: Math.max(drag.orig.startTime + dMs + MIN_NOTE_MS, drag.orig.endTime + dMs),
        frequency: a4 * Math.pow(2, (Math.max(lowMidi, Math.min(highMidi, drag.orig.midi + dMidi)) - 69) / 12),
      } : n).sort((a, b) => a.startTime - b.startTime));
      return;
    }
    if (drag.kind === 'resize') {
      const dMs = snap(tMs) - snap(drag.startX);
      setNotes(prev => prev.map((n, i) => i === drag.noteIdx ? {
        ...n,
        endTime: Math.max(drag.orig.startTime + MIN_NOTE_MS, drag.orig.endTime + dMs),
      } : n));
    }
  };

  const onPointerUp = () => {
    if (drag?.kind === 'move' || drag?.kind === 'resize') {
      setNotes(prev => [...prev]
        .map(n => ({ ...n, cents: 0 }))
        .sort((a, b) => a.startTime - b.startTime));
    }
    setDrag(null);
  };

  const moveSelected = (delta: number) => {
    if (selectedNote === null) return;
    setNotes(prev => prev.map((n, i) =>
      i === selectedNote ? { ...n, midi: Math.max(lowMidi, Math.min(highMidi, n.midi + delta)), frequency: a4 * Math.pow(2, (Math.max(lowMidi, Math.min(highMidi, n.midi + delta)) - 69) / 12) } : n
    ));
  };

  const deleteSelected = () => {
    if (selectedNote === null) return;
    setNotes(prev => prev.filter((_, i) => i !== selectedNote));
    setSelectedNote(null);
  };

  const handleExport = () => {
    if (notes.length === 0) return;
    const blob = notesToMidiBlob(notes);
    downloadBlob(blob, `mastersinger-${Date.now()}.mid`);
  };

  const totalSec = notes.length > 0 ? Math.max(...notes.map(n => n.endTime)) / 1000 : 0;
  // Canvas is responsive: fill the available width, but grow horizontally when
  // the content needs more room (so short melodies don't waste space and long
  // ones become scrollable instead of cramped).
  const contentMinWidth = Math.max(PIANO_W + 120, (Math.max(totalSec, duration / 1000) + 1) * PX_PER_SEC + PIANO_W);

  const liveColor = Math.abs(liveCents) < 10 ? 'text-green-400' : Math.abs(liveCents) < 25 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'studio.title')}</h1>
        <p className="text-slate-400 text-sm">{t(lang, 'studio.subtitle')}</p>
      </div>

      {/* Live pitch while recording — big, glanceable, mobile-first */}
      {isRecording && (
        <div className="card p-5 text-center space-y-2">
          <div className={`text-6xl font-black font-mono ${liveColor} ${liveNote ? 'pulse-soft' : ''}`}>
            {liveNote || '—'}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {liveNote ? `${liveCents > 0 ? '+' : ''}${liveCents} cents` : (lang === 'pt-BR' ? 'cante agora…' : 'sing now…')}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="card p-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={handleRecord}
          className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${isRecording ? 'bg-red-500 text-white pulse-soft' : 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white'}`}
        >
          <i className={`fas ${isRecording ? 'fa-stop' : 'fa-circle'} mr-1.5`}></i>{isRecording ? t(lang, 'studio.stop') : t(lang, 'studio.record')}
        </button>
        <button onClick={handlePlay} disabled={notes.length === 0 || isPlaying} className="btn-ghost disabled:opacity-40 whitespace-nowrap">
          <i className="fas fa-play mr-1.5"></i>{t(lang, 'studio.playback')}
        </button>
        <div className="w-px h-6 bg-white/10" />
        {(['select', 'draw', 'erase'] as Tool[]).map(tl => (
          <button
            key={tl}
            onClick={() => setTool(tl)}
            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap ${tool === tl ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300'}`}
          >
            <i className={`fas ${tl === 'select' ? 'fa-arrow-pointer' : tl === 'draw' ? 'fa-pencil' : 'fa-eraser'} mr-1.5`}></i>
            {t(lang, `studio.tool.${tl}`)}
          </button>
        ))}
        <div className="w-px h-6 bg-white/10" />
        <button
          onClick={() => setQuantize(!quantize)}
          className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap ${quantize ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-300'}`}
        >
          <i className="fas fa-bolt mr-1.5"></i>{t(lang, 'studio.quantize')}
        </button>
        <div className="w-px h-6 bg-white/10" />
        <button onClick={() => { setNotes([]); setSelectedNote(null); }} disabled={notes.length === 0} className="btn-ghost disabled:opacity-40 whitespace-nowrap">
          <i className="fas fa-trash mr-1.5"></i>{t(lang, 'studio.clear')}
        </button>
        <button onClick={handleExport} disabled={notes.length === 0} className="btn-primary disabled:opacity-40 whitespace-nowrap">
          <i className="fas fa-download mr-1.5"></i>{t(lang, 'studio.export')}
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono gap-3">
        <div className="min-w-0 truncate">
          {isRecording ? (
            <span className="text-red-400 pulse-soft">● {t(lang, 'studio.recording')} ({(duration / 1000).toFixed(1)}s)</span>
          ) : notes.length > 0 ? (
            <span>{notes.length} {lang === 'pt-BR' ? 'notas' : 'notes'} · {totalSec.toFixed(1)}s</span>
          ) : (
            <span>{t(lang, 'studio.empty')}</span>
          )}
        </div>
        {selectedNote !== null && notes[selectedNote] && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-cyan-300">{midiToNoteName(notes[selectedNote].midi)} · {notes[selectedNote].endTime - notes[selectedNote].startTime}ms</span>
            <button onClick={() => moveSelected(1)} className="w-8 h-8 bg-white/10 rounded flex items-center justify-center active:bg-white/20">↑</button>
            <button onClick={() => moveSelected(-1)} className="w-8 h-8 bg-white/10 rounded flex items-center justify-center active:bg-white/20">↓</button>
            <button onClick={deleteSelected} className="w-8 h-8 bg-red-500/20 text-red-400 rounded flex items-center justify-center active:bg-red-500/30"><i className="fas fa-trash"></i></button>
          </div>
        )}
      </div>

      {/* Piano roll — responsive width, vertical scroll for pitch, keyboard pinned left */}
      <div className="card p-2">
        <div ref={rollRef} className="overflow-auto no-scrollbar" style={{ maxHeight: '52vh' }}>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`block ${tool === 'draw' ? 'cursor-crosshair' : tool === 'erase' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ width: `max(100%, ${contentMinWidth}px)`, height: rows * ROW_HEIGHT, touchAction: 'none' }}
          />
        </div>
      </div>

      {pitch.error && (
        <div className="card p-3 border-red-500/30 text-center text-red-400 text-sm">{pitch.error}</div>
      )}

      <div className="card p-4 text-xs text-slate-400 space-y-2">
        <div className="font-bold text-slate-300">{lang === 'pt-BR' ? 'Como usar' : 'How to use'}</div>
        <div>{lang === 'pt-BR'
          ? '1. Toque em Gravar e cante uma melodia — a nota aparece em tempo real. 2. As notas surgem no piano roll (verde = afinado, roxo = fora); o piano se encaixa sozinho na sua tessitura. 3. Selecionar: arraste a nota pra mover, borda direita pra redimensionar. 4. Desenhar: toque e arraste pra criar. 5. Exporte como .mid.'
          : '1. Tap Record and sing a melody — the note shows live. 2. Notes appear in the piano roll (green = in tune, purple = off); the piano auto-fits your range. 3. Select tool: drag a note to move, the right edge to resize. 4. Draw tool: tap and drag to create. 5. Export as .mid.'}</div>
      </div>
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
