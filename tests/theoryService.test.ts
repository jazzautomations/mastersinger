import { describe, it, expect } from 'vitest';
import {
  midiToFrequency,
  frequencyToMidi,
  midiToNoteName,
  midiToCents,
  NOTE_NAMES_SHARP,
  buildScale,
  buildArpeggio,
  todayISO,
  weekStartISO,
  daysBetween,
  SCALES,
  ARPEGGIO_TYPES,
  INTERVALS,
  CHORD_TYPES,
  classifyVoiceType,
  transposeOffset,
  centerOfMidis,
  transposeExercise,
} from '../services/theoryService';

describe('theoryService', () => {
  describe('midiToFrequency', () => {
    it('returns 440 Hz for A4 (midi 69)', () => {
      expect(midiToFrequency(69)).toBeCloseTo(440, 1);
    });
    it('returns 220 Hz for A3 (midi 57)', () => {
      expect(midiToFrequency(57)).toBeCloseTo(220, 1);
    });
    it('returns 880 Hz for A5 (midi 81)', () => {
      expect(midiToFrequency(81)).toBeCloseTo(880, 1);
    });
    it('returns 261.63 Hz for C4 (midi 60)', () => {
      expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
    });
    it('supports custom A4 reference', () => {
      expect(midiToFrequency(69, 442)).toBeCloseTo(442, 1);
    });
  });

  describe('frequencyToMidi', () => {
    it('returns 69 for 440 Hz', () => {
      expect(frequencyToMidi(440)).toBeCloseTo(69, 2);
    });
    it('returns 0 for non-positive frequency', () => {
      expect(frequencyToMidi(0)).toBe(0);
      expect(frequencyToMidi(-1)).toBe(0);
    });
  });

  describe('midiToNoteName', () => {
    it('names C4 (midi 60)', () => {
      expect(midiToNoteName(60)).toBe('C4');
    });
    it('names A4 (midi 69)', () => {
      expect(midiToNoteName(69)).toBe('A4');
    });
    it('names C0 (midi 12)', () => {
      expect(midiToNoteName(12)).toBe('C0');
    });
    it('names G#3 (midi 56)', () => {
      expect(midiToNoteName(56)).toBe('G#3');
    });
  });

  describe('midiToCents', () => {
    it('returns 0 for exactly on-pitch frequency', () => {
      expect(midiToCents(440)).toBe(0);
    });
    it('returns ~+25 cents for slightly sharp (25 cents)', () => {
      const sharpFreq = 440 * Math.pow(2, 0.25 / 12); // 25 cents sharp
      expect(midiToCents(sharpFreq)).toBeGreaterThan(20);
      expect(midiToCents(sharpFreq)).toBeLessThan(30);
    });
    it('returns ~-50 cents for 50 cents sharp (rounds to next note)', () => {
      const sharpFreq = 440 * Math.pow(2, 0.5 / 12); // 50 cents sharp
      // midi 69.5 rounds to 70, so deviation from 70 is -50 cents
      expect(Math.abs(midiToCents(sharpFreq))).toBeGreaterThan(40);
      expect(Math.abs(midiToCents(sharpFreq))).toBeLessThan(60);
    });
  });

  describe('buildScale', () => {
    it('builds C major starting from C4', () => {
      const notes = buildScale(60, 'major');
      expect(notes).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
    });
    it('builds C minor natural with correct intervals', () => {
      const notes = buildScale(60, 'minorNatural');
      expect(notes).toEqual([60, 62, 63, 65, 67, 68, 70, 72]);
    });
    it('builds chromatic scale', () => {
      const notes = buildScale(60, 'chromatic');
      expect(notes.length).toBe(13);
      expect(notes[0]).toBe(60);
      expect(notes[12]).toBe(72);
    });
  });

  describe('buildArpeggio', () => {
    it('builds major triad arpeggio', () => {
      const notes = buildArpeggio(60, 'major');
      expect(notes).toEqual([60, 64, 67, 72]);
    });
    it('builds minor 7 arpeggio', () => {
      const notes = buildArpeggio(60, 'minor7');
      expect(notes).toEqual([60, 63, 67, 70, 72]);
    });
  });

  describe('date helpers', () => {
    it('todayISO returns YYYY-MM-DD', () => {
      const today = todayISO();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    it('weekStartISO returns Monday of the week', () => {
      // 2024-01-17 is a Wednesday
      const wed = new Date('2024-01-17T15:00:00');
      const weekStart = weekStartISO(wed);
      expect(weekStart).toBe('2024-01-15'); // Monday
    });
    it('daysBetween counts correctly', () => {
      expect(daysBetween('2024-01-01', '2024-01-08')).toBe(7);
      expect(daysBetween('2024-01-08', '2024-01-01')).toBe(-7);
      expect(daysBetween('2024-01-01', '2024-01-01')).toBe(0);
    });
  });

  describe('data exports', () => {
    it('exports known scales', () => {
      expect(SCALES.major.intervals).toEqual([0, 2, 4, 5, 7, 9, 11, 12]);
      expect(SCALES.minorHarmonic.intervals).toEqual([0, 2, 3, 5, 7, 8, 11, 12]);
      expect(SCALES.dorian.intervals).toEqual([0, 2, 3, 5, 7, 9, 10, 12]);
    });
    it('exports known arpeggios', () => {
      expect(ARPEGGIO_TYPES.major.intervals).toEqual([0, 4, 7, 12]);
      expect(ARPEGGIO_TYPES.diminished7.intervals).toEqual([0, 3, 6, 9, 12]);
    });
    it('exports known intervals', () => {
      expect(INTERVALS.octave.semitones).toBe(12);
      expect(INTERVALS.tritone.semitones).toBe(6);
    });
    it('exports known chord types', () => {
      expect(CHORD_TYPES.major.intervals).toEqual([0, 4, 7]);
      expect(CHORD_TYPES.dominant7.intervals).toEqual([0, 4, 7, 10]);
    });
  });
});

describe('classifyVoiceType', () => {
  it('returns unknown for invalid range', () => {
    expect(classifyVoiceType(NaN, NaN)).toBe('unknown');
    expect(classifyVoiceType(80, 40)).toBe('unknown');
  });
  it('classifies a typical soprano range', () => {
    // floor C4(60), ceiling ~C6(84) → soprano
    expect(classifyVoiceType(60, 84)).toBe('soprano');
  });
  it('classifies a typical bass range', () => {
    // floor C2(36), ceiling ~G3(55) → bass
    expect(classifyVoiceType(36, 55)).toBe('bass');
  });
  it('classifies a typical tenor range', () => {
    // floor C3(48), ceiling ~G4(67) → tenor
    expect(classifyVoiceType(48, 67)).toBe('tenor');
  });
});

describe('transposeOffset', () => {
  it('returns 0 when no target center is given', () => {
    expect(transposeOffset(60, undefined)).toBe(0);
  });
  it('shifts source onto target by semitones', () => {
    expect(transposeOffset(60, 64)).toBe(4);
    expect(transposeOffset(64, 60)).toBe(-4);
  });
  it('clamps wild offsets to ±18 semitones', () => {
    expect(transposeOffset(60, 100)).toBe(18);
    expect(transposeOffset(100, 60)).toBe(-18);
  });
});

describe('centerOfMidis', () => {
  it('defaults to 60 for an empty set', () => {
    expect(centerOfMidis([])).toBe(60);
  });
  it('returns the arithmetic mean of min and max', () => {
    expect(centerOfMidis([60, 64, 67])).toBe(63.5);
  });
});

describe('transposeExercise', () => {
  it('returns the same exercise for a zero offset', () => {
    const ex = { id: 'x', targets: [{ midi: 60, startMs: 0, durationMs: 100 }] } as any;
    expect(transposeExercise(ex, 0)).toBe(ex);
  });
  it('shifts every target midi by the offset and leaves the original untouched', () => {
    const ex = { id: 'x', targets: [{ midi: 60, startMs: 0, durationMs: 100 }, { midi: 64, startMs: 100, durationMs: 100 }] } as any;
    const out = transposeExercise(ex, 5);
    expect(out.targets[0].midi).toBe(65);
    expect(out.targets[1].midi).toBe(69);
    expect(ex.targets[0].midi).toBe(60); // original unchanged
  });
});

describe('NOTE_NAMES_SHARP (Fix 5 regression)', () => {
  it('has all 12 pitch classes with A# at index 10', () => {
    expect(NOTE_NAMES_SHARP.length).toBe(12);
    expect(NOTE_NAMES_SHARP[0]).toBe('C');
    expect(NOTE_NAMES_SHARP[10]).toBe('A#');
    expect(NOTE_NAMES_SHARP[11]).toBe('B');
  });
});

describe('buildScale multi-octave (Fix 13 regression)', () => {
  it('does not duplicate the boundary note across octaves', () => {
    const notes = buildScale(60, 'major', 2);
    expect(notes.length).toBe(15);
    expect(new Set(notes).size).toBe(notes.length);
    expect(notes[0]).toBe(60);
    expect(notes[14]).toBe(84);
  });
  it('keeps single-octave behaviour unchanged', () => {
    expect(buildScale(60, 'major', 1)).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
  });
});
