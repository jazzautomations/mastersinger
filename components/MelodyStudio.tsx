import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { framesToNotes, notesToMidiBlob, downloadBlob } from '../services/midiService';
import { playNote, ensureAudioStarted, stopAll } from '../services/audioService';
import { midiToNoteName, NOTE_NAMES_SHARP } from '../services/theoryService';
import type { Note, PitchFrame } from '../types';

type Tool = 'select' | 'draw' | 'erase';

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

  const framesRef = useRef<PitchFrame[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordStartRef = useRef<number>(0);
  const playTimerRef = useRef<number | null>(null);

  const pitch = usePitchDetection({
    a4,
    onFrame: (frame) => {
      framesRef.current.push(frame);
    },
  });

  // Viewport range
  const LOW_MIDI = 36;   // C2
  const HIGH_MIDI = 84;  // C6
  const PX_PER_SEC = 80;
  const ROW_HEIGHT = 8;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const visibleSec = w / PX_PER_SEC;
    const h = (HIGH_MIDI - LOW_MIDI + 1) * ROW_HEIGHT;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);

    // background rows: alternate black/white keys
    for (let m = LOW_MIDI; m <= HIGH_MIDI; m++) {
      const y = (HIGH_MIDI - m) * ROW_HEIGHT;
      const pc = ((m % 12) + 12) % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(pc);
      ctx.fillStyle = isBlack ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, y, w, ROW_HEIGHT);

      // octave divider
      if (pc === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(0, y, w, 0.5);
        // label
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '8px JetBrains Mono';
        ctx.fillText(midiToNoteName(m), 4, y + ROW_HEIGHT - 1);
      }
    }

    // time grid
    for (let s = 0; s <= visibleSec; s++) {
      const x = s * PX_PER_SEC;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // notes
    notes.forEach((note, idx) => {
      const x = (note.startTime / 1000) * PX_PER_SEC;
      const w2 = Math.max(4, ((note.endTime - note.startTime) / 1000) * PX_PER_SEC);
      const y = (HIGH_MIDI - note.midi) * ROW_HEIGHT;
      const isSel = idx === selectedNote;
      const color = Math.abs(note.cents) < 10 ? '#22c55e' : Math.abs(note.cents) < 25 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = isSel ? '#c4b5fd' : color;
      ctx.globalAlpha = note.confidence;
      ctx.fillRect(x, y + 1, w2, ROW_HEIGHT - 2);
      ctx.globalAlpha = 1;
      // border
      ctx.strokeStyle = isSel ? '#fff' : 'rgba(0,0,0,0.4)';
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.strokeRect(x, y + 1, w2, ROW_HEIGHT - 2);
    });

    // playhead
    if (isPlaying || playheadMs > 0) {
      const x = (playheadMs / 1000) * PX_PER_SEC;
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(x, 0, 2, h);
    }
  }, [notes, isPlaying, playheadMs, selectedNote]);

  useEffect(() => { draw(); }, [draw]);

  // ── Recording ──
  const handleRecord = async () => {
    if (isRecording) {
      pitch.stop();
      const frames = framesRef.current;
      const detected = framesToNotes(frames, a4);
      setNotes(detected);
      setDuration(frames.length > 0 ? frames[frames.length - 1].timestamp : 0);
      setIsRecording(false);
      if (detected.length > 0 && !profile.badges.includes('first-studio')) {
        unlockBadge('first-studio');
      }
      return;
    }
    framesRef.current = [];
    setNotes([]);
    setDuration(0);
    recordStartRef.current = performance.now();
    setIsRecording(true);
    await pitch.start();
  };

  // ── Playback ──
  const handlePlay = async () => {
    if (notes.length === 0) return;
    await ensureAudioStarted();
    setIsPlaying(true);
    setPlayheadMs(0);
    const startT = performance.now();
    const totalMs = Math.max(...notes.map(n => n.endTime));

    notes.forEach(note => {
      setTimeout(() => playNote(note.midi, note.endTime - note.startTime, 0, a4), note.startTime);
    });

    const tick = () => {
      const elapsed = performance.now() - startT;
      setPlayheadMs(elapsed);
      if (elapsed < totalMs + 200) {
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

  // ── Quantize ──
  useEffect(() => {
    if (!quantize) return;
    setNotes(prev => prev.map(n => {
      const q = 250; // 1/4 note at 60bpm
      return { ...n, startTime: Math.round(n.startTime / q) * q, endTime: Math.round(n.endTime / q) * q };
    }));
  }, [quantize]);

  // ── Canvas click — select / erase / draw ──
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tMs = (x / PX_PER_SEC) * 1000;
    const midi = HIGH_MIDI - Math.floor(y / ROW_HEIGHT);

    if (tool === 'erase') {
      setNotes(prev => prev.filter(n => !(tMs >= n.startTime && tMs <= n.endTime && midi === n.midi)));
      return;
    }
    // find note clicked
    const idx = notes.findIndex(n => tMs >= n.startTime && tMs <= n.endTime && midi === n.midi);
    if (tool === 'select') {
      setSelectedNote(idx >= 0 ? idx : null);
    } else if (tool === 'draw') {
      const newNote: Note = {
        startTime: Math.round(tMs / 100) * 100,
        endTime: Math.round(tMs / 100) * 100 + 400,
        midi,
        frequency: 440 * Math.pow(2, (midi - 69) / 12),
        cents: 0,
        velocity: 90,
        confidence: 1,
      };
      setNotes(prev => [...prev, newNote].sort((a, b) => a.startTime - b.startTime));
    }
  };

  // ── Move selected note up/down ──
  const moveSelected = (delta: number) => {
    if (selectedNote === null) return;
    setNotes(prev => prev.map((n, i) => i === selectedNote ? { ...n, midi: Math.max(LOW_MIDI, Math.min(HIGH_MIDI, n.midi + delta)) } : n));
  };

  // ── Delete selected ──
  const deleteSelected = () => {
    if (selectedNote === null) return;
    setNotes(prev => prev.filter((_, i) => i !== selectedNote));
    setSelectedNote(null);
  };

  // ── Export ──
  const handleExport = () => {
    if (notes.length === 0) return;
    const blob = notesToMidiBlob(notes);
    downloadBlob(blob, `mastersinger-${Date.now()}.mid`);
  };

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
          className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${isRecording ? 'bg-red-500 text-white' : 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white'}`}
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
            <span>{notes.length} {lang === 'pt-BR' ? 'notas' : 'notes'} · {(Math.max(...notes.map(n => n.endTime)) / 1000).toFixed(1)}s</span>
          ) : (
            <span>{t(lang, 'studio.empty')}</span>
          )}
        </div>
        {selectedNote !== null && notes[selectedNote] && (
          <div className="flex items-center gap-2">
            <span className="text-violet-400">{midiToNoteName(notes[selectedNote].midi)} · {notes[selectedNote].cents}c</span>
            <button onClick={() => moveSelected(1)} className="px-2 py-0.5 bg-white/10 rounded">↑</button>
            <button onClick={() => moveSelected(-1)} className="px-2 py-0.5 bg-white/10 rounded">↓</button>
            <button onClick={deleteSelected} className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded"><i className="fas fa-trash"></i></button>
          </div>
        )}
      </div>

      {/* Piano roll canvas */}
      <div className="card p-3 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full cursor-pointer"
            style={{ minWidth: `${Math.max(800, (duration / 1000 + 2) * PX_PER_SEC)}px` }}
          />
        </div>
      </div>

      {pitch.error && (
        <div className="card p-3 border-red-500/30 text-center text-red-400 text-sm">{pitch.error}</div>
      )}

      <div className="card p-4 text-xs text-slate-400 space-y-2">
        <div className="font-bold text-slate-300">{lang === 'pt-BR' ? 'Como usar' : 'How to use'}</div>
        <div>{lang === 'pt-BR'
          ? '1. Aperte Gravar e cante uma melodia. 2. As notas detectadas aparecem no piano roll (verde = afinado, amarelo = ±25 cents, vermelho = fora). 3. Use as ferramentas para editar. 4. Exporte como .mid.'
          : '1. Press Record and sing a melody. 2. Detected notes appear in the piano roll (green = in tune, yellow = ±25 cents, red = off). 3. Use tools to edit. 4. Export as .mid.'}</div>
      </div>
    </div>
  );
}
