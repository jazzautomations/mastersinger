import type { Badge } from '../types';

export const BADGES: Badge[] = [
  // ── First-time achievements ──
  { id: 'first-tuner',     name: 'Pitch On',          description: 'Used the Tuner for the first time.',          icon: '🎙️' },
  { id: 'first-practice',  name: 'First Reps',         description: 'Completed your first practice exercise.',     icon: '💪' },
  { id: 'first-studio',    name: 'Captured',           description: 'Recorded a melody in the Studio.',            icon: '📼' },
  { id: 'first-ear',       name: 'Good Ear',           description: 'Answered your first ear training question.',  icon: '👂' },
  { id: 'first-lesson',    name: 'Student',            description: 'Completed your first Academy lesson.',        icon: '📚' },

  // ── Streaks ──
  { id: 'streak-3',        name: '3-Day Streak',       description: 'Practiced 3 days in a row.',                  icon: '🔥' },
  { id: 'streak-7',        name: 'Week Warrior',       description: '7-day streak.',                               icon: '⚡' },
  { id: 'streak-30',       name: 'Unstoppable',        description: '30-day streak.',                              icon: '🚀' },

  // ── Pitch accuracy ──
  { id: 'perfect-tuner',   name: 'Dead Center',        description: 'Held a note within ±2 cents for 3 seconds.',  icon: '🎯' },
  { id: 'perfect-score',   name: 'Perfect Run',        description: 'Scored 100% on any exercise.',                icon: '💯' },
  { id: 'accuracy-95',     name: 'Sharp Shooter',      description: 'Achieved 95%+ pitch accuracy 10 times.',      icon: '✨' },

  // ── Range ──
  { id: 'range-2oct',      name: 'Two Octaves',        description: 'Detected a 2-octave vocal range.',            icon: '🏔️' },
  { id: 'range-3oct',      name: 'Three Octaves',      description: 'Detected a 3-octave vocal range.',            icon: '🌋' },

  // ── Ear training ──
  { id: 'ear-streak-10',   name: 'Sharp Ear',          description: 'Answered 10 ear questions in a row correctly.', icon: '🦉' },

  // ── Academy ──
  { id: 'course-warmup',   name: 'Warmup Graduate',    description: 'Completed the Vocal Warmup course.',          icon: '🎓' },
  { id: 'course-pitch',    name: 'Pitch Master',       description: 'Completed the Pitch Accuracy course.',        icon: '🏅' },
  { id: 'course-intervals',name: 'Interval Scholar',   description: 'Completed the Intervals course.',             icon: '📐' },
  { id: 'course-scales',   name: 'Scale Sage',         description: 'Completed the Scales & Modes course.',        icon: '🪜' },
  { id: 'course-harmony',  name: 'Harmony Healer',     description: 'Completed the Harmony course.',               icon: '🎼' },
  { id: 'all-courses',     name: 'Polymath',           description: 'Completed every Academy course.',             icon: '👑' },

  // ── Levels ──
  { id: 'level-5',         name: 'Chorister',          description: 'Reached level 5.',                            icon: '🎵' },
  { id: 'level-12',        name: 'Soloist',            description: 'Reached level 12.',                           icon: '🌟' },
  { id: 'level-22',        name: 'Vocalist',           description: 'Reached level 22.',                           icon: '🎤' },
  { id: 'level-35',        name: 'First Voice',        description: 'Reached level 35.',                           icon: '💎' },

  // ── Leagues ──
  { id: 'league-gold',     name: 'Gold Tier',          description: 'Reached Gold league for the week.',           icon: '🥇' },
  { id: 'league-diamond',  name: 'Diamond Tier',       description: 'Reached Diamond league for the week.',        icon: '💠' },
];

export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id);
}

export function getEarnedBadges(ids: string[]): Badge[] {
  return BADGES.filter(b => ids.includes(b.id));
}
