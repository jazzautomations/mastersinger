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
  });
});
