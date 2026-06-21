// MIDI file export/import using midi-writer-js
import { Note } from 'types';
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

  // Build event list: (deltaTicks, midiEvent)
  type Event = { tick: number; data: number[] };
  const events: Event[] = [];
  for (const note of sorted) {
    const startTick = Math.round((note.startTime / 1000) * (ppq * 4));
    const durTicks  = Math.max(1, Math.round((note.endTime - note.startTime) / 1000 * ppq * 4));
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
  minConfidence = 0.5,
  minNoteMs = 80,
  gapMs = 60,
): Note[] {
  if (frames.length === 0) return [];

  const notes: Note[] = [];
  let currentNote: Note | null = null;
  let lastVoicedTs = 0;
  const midiFreq = (f: number) => 69 + 12 * Math.log2(f / a4);
  const centsOf  = (f: number) => {
    const m = midiFreq(f);
    return Math.round((m - Math.round(m)) * 100);
  };

  for (const f of frames) {
    const voiced = f.frequency > 0 && f.confidence >= minConfidence;
    if (!voiced) {
      // close current note if gap is big enough
      if (currentNote && f.timestamp - lastVoicedTs > gapMs) {
        currentNote.endTime = lastVoicedTs;
        if (currentNote.endTime - currentNote.startTime >= minNoteMs) {
          notes.push(currentNote);
        }
        currentNote = null;
      }
      continue;
    }
    lastVoicedTs = f.timestamp;
    const midi = Math.round(midiFreq(f.frequency));
    if (!currentNote) {
      currentNote = {
        startTime: f.timestamp,
        endTime: f.timestamp,
        frequency: f.frequency,
        midi,
        cents: centsOf(f.frequency),
        velocity: 90,
        confidence: f.confidence,
      };
    } else if (Math.abs(midi - currentNote.midi) <= 0 && Math.abs(centsOf(f.frequency) - currentNote.cents) <= 30) {
      // same note — extend
      currentNote.endTime = f.timestamp;
      // running average of frequency
      currentNote.frequency = (currentNote.frequency + f.frequency) / 2;
      currentNote.confidence = (currentNote.confidence + f.confidence) / 2;
    } else {
      // new note — close current, start new
      currentNote.endTime = f.timestamp;
      if (currentNote.endTime - currentNote.startTime >= minNoteMs) {
        notes.push(currentNote);
      }
      currentNote = {
        startTime: f.timestamp,
        endTime: f.timestamp,
        frequency: f.frequency,
        midi,
        cents: centsOf(f.frequency),
        velocity: 90,
        confidence: f.confidence,
      };
    }
  }
  if (currentNote && lastVoicedTs - currentNote.startTime >= minNoteMs) {
    currentNote.endTime = lastVoicedTs;
    notes.push(currentNote);
  }
  return notes;
}
