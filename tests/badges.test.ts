import { describe, it, expect } from 'vitest';
import { levelBadges, leagueBadges, rangeBadges } from '../store/store';
import { BADGES } from '../data/badges';

const badgeIds = new Set(BADGES.map(b => b.id));

describe('milestone badge helpers', () => {
  it('awards level badges at the right thresholds', () => {
    expect(levelBadges(1, [])).toEqual([]);
    expect(levelBadges(5, [])).toEqual(['level-5']);
    expect(levelBadges(12, [])).toEqual(['level-5', 'level-12']);
    expect(levelBadges(35, [])).toEqual(['level-5', 'level-12', 'level-22', 'level-35']);
  });

  it('does not re-award owned level badges', () => {
    expect(levelBadges(35, ['level-5', 'level-12'])).toEqual(['level-22', 'level-35']);
  });

  it('awards league badges by weekly XP', () => {
    expect(leagueBadges(100, [])).toEqual([]);            // Bronze
    expect(leagueBadges(500, [])).toEqual(['league-gold']); // Gold
    expect(leagueBadges(900, [])).toEqual(['league-gold']); // Platinum still counts as gold-tier reached
    expect(leagueBadges(1500, [])).toEqual(['league-gold', 'league-diamond']);
    expect(leagueBadges(1500, ['league-gold'])).toEqual(['league-diamond']);
  });

  it('awards range badges by span', () => {
    expect(rangeBadges(12, [])).toEqual([]);
    expect(rangeBadges(24, [])).toEqual(['range-2oct']);
    expect(rangeBadges(36, [])).toEqual(['range-2oct', 'range-3oct']);
    expect(rangeBadges(36, ['range-2oct'])).toEqual(['range-3oct']);
  });

  it('every milestone badge id these helpers emit is a real defined badge', () => {
    const emitted = [
      ...levelBadges(99, []),
      ...leagueBadges(99999, []),
      ...rangeBadges(99, []),
    ];
    for (const id of emitted) expect(badgeIds, `badge ${id} undefined`).toContain(id);
  });
});
