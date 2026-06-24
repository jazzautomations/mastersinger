// MIDI file export/import using midi-writer-js
import type { Note } from '../types';
import { midiToFrequency } from './theoryService';

// Convert our Note[] to a MIDI file (Blob)
export function notesToMidiBlob(notes: Note[], ppq = 480, bpm = 120): Blob {
  // Lazy import to keep initial bundle smaller
  // Use the synchronous API of midi-writer-js
  // We build the track manually since the lib is small
  const ticksPerQuarter = ppq;
  const microsecondsPerQuarter = Math.round(60000000 / bpm);

  // Build raw MIDI bytes
  const header = buildHeader(ticksPerQuarter);
  const track = buildTrack(notes, ticksPerQuarter, microsecondsPerQuarter);

  const bytes = [...header, ...track];
  return new Blob([new Uint8Array(bytes)], { type: 'audio/midi' });
}

function buildHeader(ppq: number): number[] {
  // MThd, length=6, format=0, ntracks=1, division=ppq
  const bytes: number[] = [];
  pushStr(bytes, 'MThd');
  pushU32(bytes, 6);
  pushU16(bytes, 0);         // format 0
  pushU16(bytes, 1);         // 1 track
  pushU16(bytes, ppq);
  return bytes;
}

function buildTrack(notes: Note[], ppq: number, mpq: number): number[] {
  const bytes: number[] = [];

  // Tempo meta event at the start
  pushVarLen(bytes, 0);
  bytes.push(0xFF, 0x51, 0x03);
  bytes.push((mpq >> 16) & 0xFF, (mpq >> 8) & 0xFF, mpq & 0xFF);

  // Program change: 0 = Acoustic Grand Piano
  pushVarLen(bytes, 0);
  bytes.push(0xC0, 0x00);

  // Sort notes by start time
  const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);

  // ── Tick↔time mapping. MIDI ticks are measured per quarter note (ppq) and
  //    seconds map to ticks via the TEMPO, not via a magic constant. The old
  //    code used `ppq * 4` (1920 ticks/sec @ ppq480) while writing a 120 BPM
  //    tempo meta (960 ticks/sec) — so every note landed at 2× the correct
  //    tick, and the file played back at HALF SPEED. Long melodies stretched
  //    proportionally and looked/played "bugged". Correct rate:
  //    ticks/sec = ppq * bpm/60 = ppq * 1e6 / mpq. ──
  const ticksPerSec = (ppq * 1_000_000) / mpq;

  // Build event list: (deltaTicks, midiEvent)
  type Event = { tick: number; data: number[] };
  const events: Event[] = [];
  for (const note of sorted) {
    const startTick = Math.round((note.startTime / 1000) * ticksPerSec);
    const durTicks  = Math.max(1, Math.round((note.endTime - note.startTime) / 1000 * ticksPerSec));
    events.push({ tick: startTick, data: [0x90, note.midi & 0x7F, note.velocity & 0x7F] });               // note on
    events.push({ tick: startTick + durTicks, data: [0x80, note.midi & 0x7F, 0] });                         // note off
  }
  events.sort((a, b) => a.tick - b.tick || (a.data[0] === 0x80 ? -1 : 1));

  let lastTick = 0;
  for (const ev of events) {
    const delta = Math.max(0, ev.tick - lastTick);
    lastTick = ev.tick;
    pushVarLen(bytes, delta);
    for (const b of ev.data) bytes.push(b);
  }

  // End of track
  pushVarLen(bytes, 0);
  bytes.push(0xFF, 0x2F, 0x00);

  // MTrk header
  const header: number[] = [];
  pushStr(header, 'MTrk');
  pushU32(header, bytes.length);
  return [...header, ...bytes];
}

function pushStr(arr: number[], s: string) {
  for (let i = 0; i < s.length; i++) arr.push(s.charCodeAt(i) & 0xFF);
}
function pushU32(arr: number[], v: number) {
  arr.push((v >>> 24) & 0xFF, (v >>> 16) & 0xFF, (v >>> 8) & 0xFF, v & 0xFF);
}
function pushU16(arr: number[], v: number) {
  arr.push((v >>> 8) & 0xFF, v & 0xFF);
}
function pushVarLen(arr: number[], v: number) {
  const bytes: number[] = [];
  bytes.push(v & 0x7F);
  v >>= 7;
  while (v > 0) {
    bytes.push((v & 0x7F) | 0x80);
    v >>= 7;
  }
  for (let i = bytes.length - 1; i >= 0; i--) arr.push(bytes[i]);
}

// ── Trigger a download of a blob ──
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Convert a sequence of pitch frames to Notes ──
interface FrameLite { frequency: number; confidence: number; timestamp: number; }
export function framesToNotes(
  frames: FrameLite[],
  a4 = 440,
  minConfidence = 0.35,
  minNoteMs = 70,
  gapMs = 90,
): Note[] {
  if (frames.length === 0) return [];

  const midiFreq = (f: number) => 69 + 12 * Math.log2(f / a4);
  const centsOf  = (f: number) => {
    const m = midiFreq(f);
    return Math.round((m - Math.round(m)) * 100);
  };

  // ── Pre-smooth with a short median window so a single jittery frame can't
  //    fragment a sustained note or invent a pitch blip. Frames arrive ~every
  //    16ms (rAF); a 7-frame window ≈ 110ms of context — wider than before (5)
  //    because the studio skips the live smoother, so it needs more local
  //    averaging here to absorb the single-frame octave jumps YIN still lets
  //    through on soft/breathy phonation. ──
  const WIN = 7;
  const voiced: { ts: number; midi: number; freq: number; conf: number }[] = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.frequency <= 0 || f.confidence < minConfidence) continue;
    const slice: number[] = [];
    for (let j = Math.max(0, i - 2); j <= Math.min(frames.length - 1, i + 2); j++) {
      if (frames[j].frequency > 0 && frames[j].confidence >= minConfidence) slice.push(frames[j].frequency);
    }
    if (slice.length === 0) continue;
    const sorted = [...slice].sort((a, b) => a - b);
    const med = sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    voiced.push({ ts: f.timestamp, midi: Math.round(midiFreq(med)), freq: med, conf: f.confidence });
  }
  if (voiced.length === 0) return [];

  // ── Octave-error rejection. The raw path skips the live smoother (so note
  //    timestamps stay aligned with real time), but that also skips the
  //    smoother's octave guard — so a single YIN doubling/halving frame would
  //    show up as a note an octave off. Fold those back against a rolling
  //    median, exactly like the smoother does, before segmentation sees them. ──
  const refWindow: number[] = [];
  for (const v of voiced) {
    let freq = v.freq;
    if (refWindow.length >= 3) {
      const ref = medianOf(refWindow);
      if (ref > 0) {
        const ratio = freq / ref;
        if (ratio > 1.7 && ratio < 2.3) freq = freq / 2;
        else if (ratio > 0.43 && ratio < 0.59) freq = freq * 2;
        else if (ratio > 2.3 || ratio < 0.42) freq = ref;
      }
    }
    refWindow.push(freq);
    if (refWindow.length > 7) refWindow.shift();
    v.freq = freq;
    v.midi = Math.round(midiFreq(freq));
  }

  // ── Greedy segmentation with a debounce. A brief pitch excursion (< 60ms)
  //    on a different note is absorbed into the current note; a sustained
  //    change (>= 60ms) splits, with the split point where the new note began.
  //    This stops a one-frame wobble from carving a sustained note to pieces. ──
  const DEBOUNCE_MS = 75;
  const notes: Note[] = [];

  let cur: { midi: number; start: number; end: number; freqs: number[]; confs: number[] } | null = null;
  let cand: { midi: number; start: number; freqs: number[]; confs: number[] } | null = null;
  let lastTs = voiced[0].ts;

  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const stableSlice = (arr: number[]) => {
    if (arr.length <= 3) return arr;
    const start = Math.floor(arr.length * 0.2);
    const end = Math.ceil(arr.length * 0.8);
    return arr.slice(Math.max(0, start), Math.max(start + 1, end));
  };
  // Median of a sample — used for the note's representative cents so the
  // attack (often under-pitched) and the release (often flat as air runs out)
  // don't drag the readout away from the note you actually held. The old code
  // averaged every frame's frequency, which made a clean sustained note look
  // ~10–20 cents off whenever the onset or tail was imperfect — the core
  // "estúdio não é preciso" complaint.
  const closeCurrent = (endTs: number) => {
    if (!cur) return;
    if (endTs - cur.start >= minNoteMs) {
      // Representative cents from the STABLE MIDDLE 60% of the note's frames,
      // dropping the first 20% (onset settle) and last 20% (release decay).
      // The old code averaged every frame's frequency, which made a clean
      // sustained note look ~10–20 cents off whenever the onset or tail was
      // imperfect — the core "estúdio não é preciso" complaint.
      const stableFreqs = stableSlice(cur.freqs);
      const repFreq = stableFreqs.length ? medianOf(stableFreqs) : avg(cur.freqs);
      notes.push({
        startTime: cur.start, endTime: endTs,
        frequency: repFreq, midi: cur.midi,
        cents: centsOf(repFreq),
        velocity: 90, confidence: avg(cur.confs),
      });
    }
    cur = null;
  };

  for (const v of voiced) {
    lastTs = v.ts;
    if (!cur) {
      cur = { midi: v.midi, start: v.ts, end: v.ts, freqs: [v.freq], confs: [v.conf] };
      cand = null;
      continue;
    }
    if (v.midi === cur.midi) {
      if (cand) {
        // the excursion ended — absorb it back into the current note
        cur.freqs.push(...cand.freqs, v.freq);
        cur.confs.push(...cand.confs, v.conf);
        cur.end = v.ts;
        cand = null;
      } else {
        cur.freqs.push(v.freq);
        cur.confs.push(v.conf);
        cur.end = v.ts;
      }
    } else if (cand && v.midi === cand.midi) {
      cand.freqs.push(v.freq);
      cand.confs.push(v.conf);
      if (v.ts - cand.start >= DEBOUNCE_MS) {
        // sustained change — commit: current note ends where the new one began
        closeCurrent(cand.start);
        cur = { midi: cand.midi, start: cand.start, end: v.ts, freqs: [...cand.freqs], confs: [...cand.confs] };
        cand = null;
      }
    } else {
      // a different note appears — start watching it as a candidate
      cand = { midi: v.midi, start: v.ts, freqs: [v.freq], confs: [v.conf] };
    }
  }
  closeCurrent(lastTs);

  // If the final note is very short, treat it as tail noise.
  if (notes.length > 0 && notes[notes.length - 1].endTime - notes[notes.length - 1].startTime < minNoteMs) {
    notes.pop();
  }

  // ── Merge adjacent same-pitch notes separated by a tiny gap (the debounce
  //    can leave a sliver of silence between two same-pitch segments). ──
  const merged: Note[] = [];
  for (const n of notes) {
    const prev = merged[merged.length - 1];
    if (prev && prev.midi === n.midi && n.startTime - prev.endTime <= gapMs) {
      prev.endTime = n.endTime;
      prev.frequency = (prev.frequency + n.frequency) / 2;
      prev.confidence = Math.max(prev.confidence, n.confidence);
    } else {
      merged.push({ ...n });
    }
  }
  return merged;
}

function medianOf(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const len = sorted.length;
  return len % 2
    ? sorted[(len - 1) / 2]
    : (sorted[len / 2 - 1] + sorted[len / 2]) / 2;
}
