import { describe, it, expect } from 'vitest';
import { COURSES, getCourseById } from '../data/courses';
import { BADGES, getBadgeById, getEarnedBadges } from '../data/badges';

describe('courses data', () => {
  it('exports multiple courses', () => {
    expect(COURSES.length).toBeGreaterThanOrEqual(5);
  });

  it('has unique course IDs', () => {
    const ids = COURSES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every course has lessons', () => {
    COURSES.forEach(c => {
      expect(c.lessons.length).toBeGreaterThan(0);
    });
  });

  it('every lesson has content', () => {
    COURSES.forEach(c => {
      c.lessons.forEach(l => {
        expect(l.content.length).toBeGreaterThan(0);
      });
    });
  });

  it('every lesson has positive XP', () => {
    COURSES.forEach(c => {
      c.lessons.forEach(l => {
        expect(l.xp).toBeGreaterThan(0);
      });
    });
  });

  it('lesson indices are sequential within each course', () => {
    COURSES.forEach(c => {
      c.lessons.forEach((l, i) => {
        expect(l.index).toBe(i);
      });
    });
  });

  it('getCourseById returns the right course', () => {
    const c = getCourseById('warmup');
    expect(c).toBeDefined();
    expect(c?.title).toBe('Vocal Warmup');
  });

  it('getCourseById returns undefined for unknown id', () => {
    expect(getCourseById('nonexistent')).toBeUndefined();
  });
});

describe('badges data', () => {
  it('exports multiple badges', () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(15);
  });

  it('has unique badge IDs', () => {
    const ids = BADGES.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every badge has icon and description', () => {
    BADGES.forEach(b => {
      expect(b.icon.length).toBeGreaterThan(0);
      expect(b.description.length).toBeGreaterThan(0);
    });
  });

  it('getBadgeById returns the right badge', () => {
    const b = getBadgeById('first-tuner');
    expect(b).toBeDefined();
    expect(b?.name).toBe('Pitch On');
  });

  it('getEarnedBadges filters correctly', () => {
    const earned = getEarnedBadges(['first-tuner', 'nonexistent']);
    expect(earned.length).toBe(1);
    expect(earned[0].id).toBe('first-tuner');
  });
});
