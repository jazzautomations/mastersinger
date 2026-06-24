import { describe, it, expect } from 'vitest';
import { medianCentsForNote, type CentsSample } from '../audio/centsDisplay';

describe('medianCentsForNote', () => {
  it('returns null when fewer than minSamples of the same note exist', () => {
    const history: CentsSample[] = [
      { note: 'A4', cents: 3 },
      { note: 'A4', cents: 5 },
    ];
    expect(medianCentsForNote(history, 'A4')).toBeNull();
  });

  it('returns the median of same-note samples', () => {
    const history: CentsSample[] = [
      { note: 'A4', cents: -40 }, // outlier from a noisy frame
      { note: 'A4', cents: 2 },
      { note: 'A4', cents: 3 },
      { note: 'A4', cents: 4 },
      { note: 'A4', cents: 50 }, // outlier from vibrato excursion
    ];
    // sorted: [-40, 2, 3, 4, 50] → median 3
    expect(medianCentsForNote(history, 'A4')).toBe(3);
  });

  it('ignores samples from a different note', () => {
    const history: CentsSample[] = [
      { note: 'A4', cents: 2 },
      { note: 'B4', cents: 45 }, // singer moved up — must NOT pollute A4 median
      { note: 'A4', cents: 3 },
      { note: 'A4', cents: 4 },
      { note: 'B4', cents: -30 },
    ];
    expect(medianCentsForNote(history, 'A4')).toBe(3);
  });

  it('averages the two middle values for an even sample count', () => {
    const history: CentsSample[] = [
      { note: 'G4', cents: 1 },
      { note: 'G4', cents: 2 },
      { note: 'G4', cents: 3 },
      { note: 'G4', cents: 4 },
    ];
    expect(medianCentsForNote(history, 'G4', 3)).toBe(2.5);
  });

  it('returns null when no samples match the requested note', () => {
    const history: CentsSample[] = [
      { note: 'A4', cents: 2 },
      { note: 'A4', cents: 3 },
      { note: 'A4', cents: 4 },
    ];
    expect(medianCentsForNote(history, 'C5')).toBeNull();
  });
});
