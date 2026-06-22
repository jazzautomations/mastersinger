import { COURSE_PT, type CoursePtLesson } from '../data/courses.pt';
import type { Course, Lesson, Language } from '../types';

// ── Bilingual course content helpers.
//    The five original courses were authored in English; their pt-BR
//    translation lives in data/courses.pt.ts. The three newer courses
//    (vocal-anatomy, vocal-health, singing-technique) are authored directly
//    in pt-BR, so they have no COURSE_PT entry and pass through unchanged.
//    For English users, the original text is always used. ──

export function courseTitle(c: Course, lang: Language): string {
  return lang === 'pt-BR' ? (COURSE_PT[c.id]?.title ?? c.title) : c.title;
}

export function courseDesc(c: Course, lang: Language): string {
  return lang === 'pt-BR' ? (COURSE_PT[c.id]?.description ?? c.description) : c.description;
}

export function lessonTitle(c: Course, l: Lesson, lang: Language): string {
  return lang === 'pt-BR' ? (COURSE_PT[c.id]?.lessons[l.id]?.title ?? l.title) : l.title;
}

export function lessonSummary(c: Course, l: Lesson, lang: Language): string {
  return lang === 'pt-BR' ? (COURSE_PT[c.id]?.lessons[l.id]?.summary ?? l.summary) : l.summary;
}

export interface LocalizedBlock {
  text: string;         // heading / paragraph / tip
  items?: string[];     // list
  label?: string;       // audio
}

export function blockText(
  c: Course,
  l: Lesson,
  i: number,
  block: LessonBlock,
  lang: Language,
): LocalizedBlock {
  if (lang !== 'pt-BR') {
    return {
      text: (block as any).text ?? '',
      items: (block as any).items,
      label: (block as any).label,
    };
  }
  const pt = COURSE_PT[c.id]?.lessons[l.id]?.blocks[i];
  if (!pt) {
    return {
      text: (block as any).text ?? '',
      items: (block as any).items,
      label: (block as any).label,
    };
  }
  return {
    text: pt.pt ?? (block as any).text ?? '',
    items: pt.itemsPt ?? (block as any).items,
    label: pt.labelPt ?? (block as any).label,
  };
}

// re-export so consumers can import everything from one place
export type { CoursePtLesson };
