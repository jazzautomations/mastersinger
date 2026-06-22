import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { framesToNotes, notesToMidiBlob, downloadBlob } from '../services/midiService';
import { playNote, ensureAudioStarted, stopAll } from '../services/audioService';
import { midiToNoteName, NOTE_NAMES_SHARP } from '../services/theoryService';
import type { Note, PitchFrame } from '../types';

type Tool = 'select' | 'draw' | 'erase';

// ── Piano roll geometry ──
const ROW_HEIGHT = 22;       // px per semitone — fat enough to click/drag comfortably
const PX_PER_SEC = 90;       // horizontal zoom
const PIANO_W = 46;          // pinned left keyboard column
const LOW_MIDI = 48;         // C3
const HIGH_MIDI = 84;        // C6
const ROWS = HIGH_MIDI - LOW_MIDI + 1;
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
  const [drag, setDrag] = useState<null | {
    kind: 'move' | 'resize' | 'create';
    noteIdx: number;          // for move/resize
    startX: number; startY: number;
    orig: Note;               // snapshot at drag start
    createMidi?: number; createStart?: number;
  }>(null);

  const framesRef = useRef<PitchFrame[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);
  const playTimerRef = useRef<number | null>(null);

  const pitch = usePitchDetection({
    a4,
    smoothing: false,   // raw frames: let framesToNotes own the smoothing so
                        // note timestamps line up with real time (EMA in the
                        // hook would lag pitch behind its timestamp).
    onFrame: (frame) => { framesRef.current.push(frame); },
  });

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
    const midi = HIGH_MIDI - Math.floor(y / ROW_HEIGHT);
    return { tMs, midi, x, y };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = ROWS * ROW_HEIGHT;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);

    // background rows (black/white keys)
    for (let m = LOW_MIDI; m <= HIGH_MIDI; m++) {
      const y = (HIGH_MIDI - m) * ROW_HEIGHT;
      const pc = ((m % 12) + 12) % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(pc);
      ctx.fillStyle = isBlack ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(PIANO_W, y, w - PIANO_W, ROW_HEIGHT);
      if (pc === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.fillRect(PIANO_W, y, w - PIANO_W, 1);
      }
    }

    // time grid
    const visibleSec = (w - PIANO_W) / PX_PER_SEC;
    for (let s = 0; s <= visibleSec + 1; s += 0.5) {
      const x = PIANO_W + s * PX_PER_SEC;
      ctx.strokeStyle = s % 1 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    // pinned keyboard column
    ctx.fillStyle = 'rgba(10,10,20,0.96)';
    ctx.fillRect(0, 0, PIANO_W, h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(PIANO_W - 1, 0, 1, h);
    for (let m = LOW_MIDI; m <= HIGH_MIDI; m++) {
      const y = (HIGH_MIDI - m) * ROW_HEIGHT;
      const pc = ((m % 12) + 12) % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(pc);
      ctx.fillStyle = isBlack ? '#0e0e1a' : '#1b1b2c';
      ctx.fillRect(0, y, PIANO_W - 1, ROW_HEIGHT);
      if (pc === 0) {
        ctx.fillStyle = '#c4b5fd';
        ctx.font = '600 9px JetBrains Mono';
        ctx.fillText(midiToNoteName(m), 5, y + ROW_HEIGHT - 6);
      }
    }

    // notes
    notes.forEach((note, idx) => {
      const x = PIANO_W + (note.startTime / 1000) * PX_PER_SEC;
      const w2 = Math.max(6, ((note.endTime - note.startTime) / 1000) * PX_PER_SEC);
      const y = (HIGH_MIDI - note.midi) * ROW_HEIGHT;
      const isSel = idx === selectedNote;
      const color = Math.abs(note.cents) < 10 ? '#22c55e' : Math.abs(note.cents) < 25 ? '#f59e0b' : '#7c3aed';
      ctx.globalAlpha = Math.max(0.55, note.confidence);
      ctx.fillStyle = isSel ? '#67e8f9' : color;
      roundRect(ctx, x, y + 2, w2, ROW_HEIGHT - 4, 5);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isSel ? '#fff' : 'rgba(0,0,0,0.45)';
      ctx.lineWidth = isSel ? 2 : 1;
      roundRect(ctx, x, y + 2, w2, ROW_HEIGHT - 4, 5);
      ctx.stroke();
      // resize handle hint on selected note
      if (isSel) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x + w2 - 4, y + 4, 2, ROW_HEIGHT - 8);
      }
    });

    // playhead
    if (isPlaying || playheadMs > 0) {
      const x = PIANO_W + (playheadMs / 1000) * PX_PER_SEC;
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(x, 0, 2, h);
    }
  }, [notes, isPlaying, playheadMs, selectedNote, quantize]);

  useEffect(() => { draw(); }, [draw]);

  // ── Recording ──
  const handleRecord = async () => {
    if (isRecording) {
      pitch.stop();
      const frames = framesRef.current;
      const detected = framesToNotes(frames, a4);
      setNotes(detected);
      setDuration(frames.length > 0 ? frames[frames.length - 1].timestamp : 0);
      setSelectedNote(null);
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
    setIsRecording(true);
    await pitch.start();
  };

  // ── Playback (Tone-scheduled = sample-accurate; rAF only drives the visual playhead) ──
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
      const newNote: Note = {
        startTime: start, endTime: start + QUANT_MS,
        midi: Math.max(LOW_MIDI, Math.min(HIGH_MIDI, midi)),
        frequency: a4 * Math.pow(2, (Math.max(LOW_MIDI, Math.min(HIGH_MIDI, midi)) - 69) / 12),
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
      const y0 = (HIGH_MIDI - n.midi) * ROW_HEIGHT;
      const rx = PIANO_W + (tMs / 1000) * PX_PER_SEC;
      const ry = (HIGH_MIDI - midi) * ROW_HEIGHT;
      if (rx >= x0 && rx <= x1 && ry >= y0 && ry <= y0 + ROW_HEIGHT) {
        hitIdx = i;
        onHandle = rx >= x1 - 8;
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
        midi: Math.max(LOW_MIDI, Math.min(HIGH_MIDI, drag.orig.midi + dMidi)),
        startTime: Math.max(0, drag.orig.startTime + dMs),
        endTime: Math.max(drag.orig.startTime + dMs + MIN_NOTE_MS, drag.orig.endTime + dMs),
        frequency: a4 * Math.pow(2, (Math.max(LOW_MIDI, Math.min(HIGH_MIDI, drag.orig.midi + dMidi)) - 69) / 12),
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
      // re-sort and recompute cents for moved notes
      setNotes(prev => [...prev]
        .map(n => ({ ...n, cents: 0 }))
        .sort((a, b) => a.startTime - b.startTime));
    }
    setDrag(null);
  };

  const moveSelected = (delta: number) => {
    if (selectedNote === null) return;
    setNotes(prev => prev.map((n, i) =>
      i === selectedNote ? { ...n, midi: Math.max(LOW_MIDI, Math.min(HIGH_MIDI, n.midi + delta)), frequency: a4 * Math.pow(2, (Math.max(LOW_MIDI, Math.min(HIGH_MIDI, n.midi + delta)) - 69) / 12) } : n
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
  const canvasMinWidth = Math.max(720, (Math.max(totalSec, duration / 1000) + 1) * PX_PER_SEC + PIANO_W);

  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'studio.title')}</h1>
        <p className="text-slate-400 text-sm">{t(lang, 'studio.subtitle')}</p>
      </div>

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
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
        <div>
          {isRecording ? (
            <span className="text-red-400 pulse-soft">● {t(lang, 'studio.recording')} ({(duration / 1000).toFixed(1)}s)</span>
          ) : notes.length > 0 ? (
            <span>{notes.length} {lang === 'pt-BR' ? 'notas' : 'notes'} · {totalSec.toFixed(1)}s</span>
          ) : (
            <span>{t(lang, 'studio.empty')}</span>
          )}
        </div>
        {selectedNote !== null && notes[selectedNote] && (
          <div className="flex items-center gap-2">
            <span className="text-cyan-300">{midiToNoteName(notes[selectedNote].midi)} · {(notes[selectedNote].endTime - notes[selectedNote].startTime)}ms</span>
            <button onClick={() => moveSelected(1)} className="px-2 py-0.5 bg-white/10 rounded">↑</button>
            <button onClick={() => moveSelected(-1)} className="px-2 py-0.5 bg-white/10 rounded">↓</button>
            <button onClick={deleteSelected} className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded"><i className="fas fa-trash"></i></button>
          </div>
        )}
      </div>

      {/* Piano roll — horizontal scroll for time, vertical scroll for pitch, keyboard pinned left */}
      <div className="card p-2">
        <div ref={rollRef} className="overflow-auto no-scrollbar" style={{ maxHeight: '46vh' }}>
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`block ${tool === 'draw' ? 'cursor-crosshair' : tool === 'erase' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ width: canvasMinWidth, height: ROWS * ROW_HEIGHT, touchAction: 'none' }}
          />
        </div>
      </div>

      {pitch.error && (
        <div className="card p-3 border-red-500/30 text-center text-red-400 text-sm">{pitch.error}</div>
      )}

      <div className="card p-4 text-xs text-slate-400 space-y-2">
        <div className="font-bold text-slate-300">{lang === 'pt-BR' ? 'Como usar' : 'How to use'}</div>
        <div>{lang === 'pt-BR'
          ? '1. Aperte Gravar e cante uma melodia. 2. As notas aparecem no piano roll (verde = afinado, roxo = fora). 3. Ferramenta Selecionar: arraste a nota pra mover, alça direita pra redimensionar. 4. Desenhar: clique e arraste pra criar. 5. Exporte como .mid.'
          : '1. Press Record and sing a melody. 2. Notes appear in the piano roll (green = in tune, purple = off). 3. Select tool: drag a note to move, drag the right handle to resize. 4. Draw tool: click and drag to create. 5. Export as .mid.'}</div>
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
