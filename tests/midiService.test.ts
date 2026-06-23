import { describe, it, expect } from 'vitest';
import { framesToNotes, notesToMidiBlob } from '../services/midiService';
import type { Note, PitchFrame } from '../types';

describe('midiService', () => {
  describe('framesToNotes', () => {
    it('returns empty array for empty input', () => {
      expect(framesToNotes([])).toEqual([]);
    });

    it('groups contiguous same-pitch frames into a single note', () => {
      const frames: PitchFrame[] = [];
      // simulate 200ms of A4
      for (let t = 0; t < 200; t += 10) {
        frames.push({
          frequency: 440,
          confidence: 0.9,
          cents: 0,
          midi: 69,
          noteName: 'A4',
          octave: 4,
          timestamp: t,
        });
      }
      const notes = framesToNotes(frames);
      expect(notes.length).toBe(1);
      expect(notes[0].midi).toBe(69);
      expect(notes[0].startTime).toBe(0);
      expect(notes[0].endTime).toBeGreaterThanOrEqual(190);
    });

    it('splits notes when pitch jumps by a semitone', () => {
      const frames: PitchFrame[] = [];
      // 100ms of A4 then 100ms of B4
      for (let t = 0; t < 100; t += 10) {
        frames.push({ frequency: 440, confidence: 0.9, cents: 0, midi: 69, noteName: 'A4', octave: 4, timestamp: t });
      }
      for (let t = 100; t < 200; t += 10) {
        frames.push({ frequency: 493.88, confidence: 0.9, cents: 0, midi: 71, noteName: 'B4', octave: 4, timestamp: t });
      }
      const notes = framesToNotes(frames);
      expect(notes.length).toBe(2);
      expect(notes[0].midi).toBe(69);
      expect(notes[1].midi).toBe(71);
    });

    it('ignores low-confidence frames', () => {
      const frames: PitchFrame[] = [{
        frequency: 440,
        confidence: 0.3,  // below threshold
        cents: 0,
        midi: 69,
        noteName: 'A4',
        octave: 4,
        timestamp: 0,
      }];
      const notes = framesToNotes(frames);
      expect(notes.length).toBe(0);
    });

    it('uses custom A4 reference', () => {
      const frames: PitchFrame[] = [{
        frequency: 442,  // 442 Hz with a4=440 would be slightly sharp A4
        confidence: 0.95,
        cents: 0,
        midi: 69,
        noteName: 'A4',
        octave: 4,
        timestamp: 0,
      }];
      // pad to make minimum duration
      for (let t = 10; t < 200; t += 10) {
        frames.push({ frequency: 442, confidence: 0.95, cents: 0, midi: 69, noteName: 'A4', octave: 4, timestamp: t });
      }
      const notes = framesToNotes(frames, 442);
      expect(notes.length).toBe(1);
      expect(notes[0].midi).toBe(69);
    });
  });

  describe('notesToMidiBlob', () => {
    it('returns a Blob with audio/midi type', () => {
      const notes: Note[] = [{
        startTime: 0,
        endTime: 500,
        frequency: 440,
        midi: 69,
        cents: 0,
        velocity: 90,
        confidence: 1,
      }];
      const blob = notesToMidiBlob(notes);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/midi');
    });

    it('starts with MThd header', async () => {
      const notes: Note[] = [{
        startTime: 0,
        endTime: 500,
        frequency: 440,
        midi: 69,
        cents: 0,
        velocity: 90,
        confidence: 1,
      }];
      const blob = notesToMidiBlob(notes);
      const buf = new Uint8Array(await blob.arrayBuffer());
      // MThd = 0x4D546864
      expect(buf[0]).toBe(0x4D);
      expect(buf[1]).toBe(0x54);
      expect(buf[2]).toBe(0x68);
      expect(buf[3]).toBe(0x64);
    });

    it('handles empty notes array', () => {
      const blob = notesToMidiBlob([]);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('handles multiple notes', () => {
      const notes: Note[] = [
        { startTime: 0,    endTime: 500,  frequency: 440,    midi: 69, cents: 0,  velocity: 90, confidence: 1 },
        { startTime: 500,  endTime: 1000, frequency: 493.88, midi: 71, cents: 0,  velocity: 90, confidence: 1 },
        { startTime: 1000, endTime: 1500, frequency: 523.25, midi: 72, cents: 0,  velocity: 90, confidence: 1 },
      ];
      const blob = notesToMidiBlob(notes);
      expect(blob.size).toBeGreaterThan(20);
    });

    // ── Regression: tick↔time mapping. The old code used `ppq * 4` for the
    //    tick rate while writing a 120 BPM tempo meta, so notes landed at 2×
    //    the correct tick and the file played at HALF SPEED (a 1s note-on
    //    decoded to 2s). Decoding tempo + the first note-on tick must give
    //    back the intended millisecond position, for both short and long
    //    melodies.
    function decodeFirstNoteOnMs(buf: Uint8Array): { mpq: number; firstNoteOnTick: number; firstNoteOnMs: number } {
      // MThd(4) + len(4) + format(2)+ntracks(2)+division(2) = 14 bytes header
      const ppq = (buf[12] << 8) | buf[13];
      // MTrk follows
      let i = 14 + 4; // skip 'MTrk'
      const trackLen = (buf[i] << 24) | (buf[i + 1] << 16) | (buf[i + 2] << 8) | buf[i + 3];
      i += 4;
      const trackStart = i;
      const trackEnd = trackStart + trackLen;
      let mpq = 500000;
      let tick = 0;
      let firstNoteOnTick = -1;
      const readVarLen = (start: number): { val: number; next: number } => {
        let v = 0; let p = start;
        for (;;) {
          const b = buf[p++];
          v = (v << 7) | (b & 0x7f);
          if ((b & 0x80) === 0) break;
        }
        return { val: v, next: p };
      };
      while (i < trackEnd) {
        const { val: delta, next } = readVarLen(i);
        i = next;
        tick += delta;
        const status = buf[i];
        if (status === 0xff && buf[i + 1] === 0x51) {
          mpq = (buf[i + 3] << 16) | (buf[i + 4] << 8) | buf[i + 5];
          i += 6;
        } else if (status === 0xc0) {
          i += 2;
        } else if ((status & 0xf0) === 0x90) {
          if (firstNoteOnTick < 0) firstNoteOnTick = tick;
          i += 3;
        } else if ((status & 0xf0) === 0x80) {
          i += 3;
        } else {
          i += 2;
        }
      }
      const ticksPerSec = (ppq * 1_000_000) / mpq;
      const firstNoteOnMs = (firstNoteOnTick / ticksPerSec) * 1000;
      return { mpq, firstNoteOnTick, firstNoteOnMs };
    }

    it('places the first note-on at the intended time (not 2x stretched)', async () => {
      const notes: Note[] = [
        { startTime: 1000, endTime: 1500, frequency: 440, midi: 69, cents: 0, velocity: 90, confidence: 1 },
      ];
      const buf = new Uint8Array(await notesToMidiBlob(notes).arrayBuffer());
      const { mpq, firstNoteOnMs } = decodeFirstNoteOnMs(buf);
      // tempo must be 120 BPM (mpq = 500000)
      expect(mpq).toBe(500000);
      // first note must decode back to ~1000ms, NOT ~2000ms (the old 2x bug)
      expect(firstNoteOnMs).toBeGreaterThan(980);
      expect(firstNoteOnMs).toBeLessThan(1020);
    });

    it('preserves timing across a long melody (30s, many notes)', async () => {
      // A 30-second melody of 60 quarter notes at 120 BPM — exactly the kind
      // of "long melody" that used to stretch and look bugged.
      const notes: Note[] = [];
      for (let k = 0; k < 60; k++) {
        notes.push({
          startTime: k * 500, endTime: k * 500 + 450,
          frequency: 440, midi: 69, cents: 0, velocity: 90, confidence: 1,
        });
      }
      const buf = new Uint8Array(await notesToMidiBlob(notes).arrayBuffer());
      // first note at 0ms, last note-on at 59*500 = 29500ms
      const { firstNoteOnMs } = decodeFirstNoteOnMs(buf);
      expect(firstNoteOnMs).toBeGreaterThanOrEqual(0);
      expect(firstNoteOnMs).toBeLessThan(20);
      // sanity: the file is well-formed and not bloated by the 2x bug
      expect(buf.length).toBeLessThan(2000);
    });
  });
});
