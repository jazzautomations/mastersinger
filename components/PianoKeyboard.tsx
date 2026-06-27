import { useState, useCallback } from 'react';
import { midiToNoteName } from '../services/theoryService';

// ──────────────────────────────────────────────────────────────────────────
// PianoKeyboard — a touch/mouse playable piano for the Studio. Press a key to
// hear the note (and, when armed, record it as MIDI). Built with pointer events
// so it works with mouse and multi-touch. White keys flow in a row; black keys
// are absolutely positioned between them.
// ──────────────────────────────────────────────────────────────────────────

interface PianoKeyboardProps {
  a4: number;
  onNoteOn: (midi: number) => void;
  onNoteOff?: (midi: number) => void;
  lowMidi?: number;     // default C3 (48)
  octaves?: number;     // default 3
}

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER = new Set([0, 2, 5, 7, 9]); // C D F G A have a black key after them
const WHITE_W = 44;
const BLACK_W = 28;

export function PianoKeyboard({ a4, onNoteOn, onNoteOff, lowMidi = 48, octaves = 3 }: PianoKeyboardProps) {
  const [active, setActive] = useState<Set<number>>(new Set());

  const press = useCallback((midi: number) => {
    setActive(prev => { const n = new Set(prev); n.add(midi); return n; });
    onNoteOn(midi);
  }, [onNoteOn]);

  const release = useCallback((midi: number) => {
    setActive(prev => { if (!prev.has(midi)) return prev; const n = new Set(prev); n.delete(midi); return n; });
    onNoteOff?.(midi);
  }, [onNoteOff]);

  // Build the list of white keys across the range.
  const whites: number[] = [];
  for (let m = lowMidi; m <= lowMidi + octaves * 12; m++) {
    if (WHITE_PCS.includes(m % 12)) whites.push(m);
  }

  return (
    <div className="overflow-x-auto no-scrollbar rounded-xl bg-slate-950/50 border border-white/5 p-1.5">
      <div className="relative select-none" style={{ width: whites.length * WHITE_W, height: 132, touchAction: 'none' }}>
        {/* white keys */}
        <div className="absolute inset-0 flex">
          {whites.map((midi) => {
            const isActive = active.has(midi);
            const isC = midi % 12 === 0;
            return (
              <div
                key={midi}
                onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); press(midi); }}
                onPointerUp={() => release(midi)}
                onPointerLeave={() => release(midi)}
                onPointerCancel={() => release(midi)}
                className={`relative flex items-end justify-center pb-1.5 rounded-b-md border-l border-white/10 transition-colors ${isActive ? 'bg-violet-400' : 'bg-gradient-to-b from-slate-100 to-slate-300'}`}
                style={{ width: WHITE_W, height: 132 }}
              >
                <span className={`text-[9px] font-mono ${isC ? 'text-violet-600 font-bold' : 'text-slate-500'}`}>{isC ? midiToNoteName(midi) : ''}</span>
              </div>
            );
          })}
        </div>
        {/* black keys */}
        {whites.map((midi, i) => {
          if (!BLACK_AFTER.has(midi % 12) || i === whites.length) return null;
          const blackMidi = midi + 1;
          if (blackMidi > lowMidi + octaves * 12) return null;
          const isActive = active.has(blackMidi);
          const left = (i + 1) * WHITE_W - BLACK_W / 2;
          return (
            <div
              key={blackMidi}
              onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); press(blackMidi); }}
              onPointerUp={() => release(blackMidi)}
              onPointerLeave={() => release(blackMidi)}
              onPointerCancel={() => release(blackMidi)}
              className={`absolute top-0 rounded-b-md z-10 ${isActive ? 'bg-violet-500' : 'bg-gradient-to-b from-slate-800 to-black'}`}
              style={{ left, width: BLACK_W, height: 82 }}
            />
          );
        })}
      </div>
    </div>
  );
}
