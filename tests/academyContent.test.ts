import { describe, it, expect } from 'vitest';
import { COURSES } from '../data/courses';
import { LESSON_EXERCISE } from '../data/lessonExercises';
import { LESSON_QUIZ } from '../data/lessonQuizzes';
import { LESSON_AUDIO } from '../data/lessonAudio';
import { LESSON_DEEP_DIVE } from '../data/lessonDeepDive';
import { getExerciseById } from '../data/exercises';

const lessonIds = COURSES.flatMap(c => c.lessons.map(l => l.id));

describe('Academy lesson → exercise mapping', () => {
  it('every lesson has a mapped exercise', () => {
    for (const id of lessonIds) {
      expect(LESSON_EXERCISE[id], `lesson ${id} missing exercise`).toBeDefined();
    }
  });

  it('every mapped exercise id resolves to a real exercise', () => {
    for (const [lesson, exId] of Object.entries(LESSON_EXERCISE)) {
      expect(getExerciseById(exId), `exercise ${exId} (lesson ${lesson}) not found`).toBeDefined();
    }
  });

  it('does not map exercises for unknown lessons', () => {
    for (const lesson of Object.keys(LESSON_EXERCISE)) {
      expect(lessonIds, `mapping references unknown lesson ${lesson}`).toContain(lesson);
    }
  });
});

describe('Academy lesson quizzes', () => {
  it('every lesson has at least one quiz', () => {
    for (const id of lessonIds) {
      expect((LESSON_QUIZ[id] ?? []).length, `lesson ${id} has no quiz`).toBeGreaterThan(0);
    }
  });

  it('every quiz is well-formed and bilingual with a valid answer', () => {
    for (const [lesson, quizzes] of Object.entries(LESSON_QUIZ)) {
      expect(lessonIds, `quiz references unknown lesson ${lesson}`).toContain(lesson);
      for (const q of quizzes) {
        expect(q.options.length, `${lesson}: en options`).toBeGreaterThanOrEqual(2);
        expect(q.optionsPt.length, `${lesson}: option count mismatch`).toBe(q.options.length);
        expect(q.answer, `${lesson}: answer out of range`).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(q.options.length);
        for (const field of [q.question, q.questionPt, q.explanation, q.explanationPt]) {
          expect(field.length, `${lesson}: empty bilingual field`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('Academy lesson audio examples', () => {
  it('every lesson has at least one audio example', () => {
    for (const id of lessonIds) {
      expect((LESSON_AUDIO[id] ?? []).length, `lesson ${id} has no audio`).toBeGreaterThan(0);
    }
  });

  it('every audio example is well-formed', () => {
    for (const [lesson, examples] of Object.entries(LESSON_AUDIO)) {
      expect(lessonIds, `audio references unknown lesson ${lesson}`).toContain(lesson);
      for (const ex of examples) {
        expect(ex.midis.length, `${lesson}: empty midis`).toBeGreaterThan(0);
        expect(['note', 'sequence', 'chord'], `${lesson}: bad mode`).toContain(ex.mode);
        for (const m of ex.midis) {
          expect(m, `${lesson}: midi out of range`).toBeGreaterThanOrEqual(36);
          expect(m).toBeLessThanOrEqual(84);
        }
        expect(ex.label.length).toBeGreaterThan(0);
        expect(ex.labelPt.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Academy lesson deep dives', () => {
  it('every lesson has a deep dive', () => {
    for (const id of lessonIds) {
      expect(LESSON_DEEP_DIVE[id], `lesson ${id} missing deep dive`).toBeDefined();
    }
  });

  it('every deep dive is complete and bilingual', () => {
    for (const [lesson, dd] of Object.entries(LESSON_DEEP_DIVE)) {
      expect(lessonIds, `deep dive references unknown lesson ${lesson}`).toContain(lesson);
      const bis = [dd.why, dd.checkpoint, ...dd.mistakes, ...dd.practice];
      for (const b of bis) {
        expect(b.en.length, `${lesson}: empty en`).toBeGreaterThan(0);
        expect(b.pt.length, `${lesson}: empty pt`).toBeGreaterThan(0);
      }
      expect(dd.mistakes.length, `${lesson}: needs mistakes`).toBeGreaterThan(0);
      expect(dd.practice.length, `${lesson}: needs practice steps`).toBeGreaterThan(0);
    }
  });
});
