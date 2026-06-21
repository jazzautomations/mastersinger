import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { t } from '../i18n/strings';
import { COURSES, getCourseById } from '../data/courses';
import { playNote, ensureAudioStarted } from '../services/audioService';
import { midiToNoteName } from '../services/theoryService';
import type { Course, Lesson, LessonBlock } from '../types';

interface AcademyProps {
  initialCourseId?: string;
  initialLessonId?: string;
}

export function Academy({ initialCourseId, initialLessonId }: AcademyProps) {
  const { profile, completeLesson, unlockBadge } = useStore();
  const lang = profile.settings.language;
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (initialCourseId) {
      const c = getCourseById(initialCourseId);
      if (c) {
        setSelectedCourse(c);
        if (initialLessonId) {
          const l = c.lessons.find(l => l.id === initialLessonId);
          if (l) setSelectedLesson(l);
        }
      }
    }
  }, [initialCourseId, initialLessonId]);

  // ── Course list ──
  if (!selectedCourse) {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'academy.title')}</h1>
          <p className="text-slate-400 text-sm">{t(lang, 'academy.subtitle')}</p>
        </div>
        <div className="grid gap-3">
          {COURSES.map(course => {
            const completed = course.lessons.filter(l => profile.completedLessons.includes(l.id)).length;
            const pct = Math.round((completed / course.lessons.length) * 100);
            return (
              <button key={course.id} onClick={() => setSelectedCourse(course)} className="card p-5 text-left hover:border-white/20 transition-all">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{course.icon}</div>
                  <div className="flex-1">
                    <div className="text-xs font-mono mb-1" style={{ color: course.color }}>{course.level.toUpperCase()}</div>
                    <div className="text-base font-bold">{course.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{course.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="h-1.5 bg-white/5 rounded-full flex-1 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: course.color }} />
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{completed}/{course.lessons.length}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Lesson list ──
  if (!selectedLesson) {
    return (
      <div className="space-y-5 pb-24">
        <button onClick={() => setSelectedCourse(null)} className="btn-ghost">
          <i className="fas fa-arrow-left mr-2"></i>{t(lang, 'common.back')}
        </button>
        <div className="card p-6">
          <div className="text-5xl mb-3">{selectedCourse.icon}</div>
          <h1 className="text-2xl font-black display tracking-tight">{selectedCourse.title}</h1>
          <p className="text-slate-400 text-sm mt-1">{selectedCourse.description}</p>
        </div>
        <div className="space-y-2">
          {selectedCourse.lessons.map((lesson, idx) => {
            const done = profile.completedLessons.includes(lesson.id);
            return (
              <button
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className="card p-4 w-full text-left hover:border-white/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono text-sm ${done ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-400'}`}>
                    {done ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{lesson.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{lesson.summary}</div>
                  </div>
                  <span className="text-xs text-violet-400 font-mono">+{lesson.xp} XP</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Lesson view ──
  return <LessonView
    lesson={selectedLesson}
    course={selectedCourse}
    lang={lang}
    onBack={() => setSelectedLesson(null)}
    onComplete={() => {
      completeLesson(selectedLesson.id, selectedLesson.xp);
      if (!profile.badges.includes('first-lesson')) unlockBadge('first-lesson');
      // course-specific badge
      const courseId = selectedCourse.id;
      const allDone = selectedCourse.lessons.every(l => profile.completedLessons.includes(l.id) || l.id === selectedLesson.id);
      if (allDone) {
        const badgeMap: Record<string, string> = {
          'warmup': 'course-warmup',
          'pitch-accuracy': 'course-pitch',
          'intervals': 'course-intervals',
          'scales': 'course-scales',
          'harmony': 'course-harmony',
        };
        const badgeId = badgeMap[courseId];
        if (badgeId && !profile.badges.includes(badgeId)) unlockBadge(badgeId);
        // Check polymath
        if (COURSES.every(c => c.lessons.every(l => profile.completedLessons.includes(l.id) || (c.id === courseId && l.id === selectedLesson.id)))) {
          if (!profile.badges.includes('all-courses')) unlockBadge('all-courses');
        }
      }
    }}
  />;
}

interface LessonViewProps {
  lesson: Lesson;
  course: Course;
  lang: 'pt-BR' | 'en';
  onBack: () => void;
  onComplete: () => void;
}

function LessonView({ lesson, course, lang, onBack, onComplete }: LessonViewProps) {
  const [completed, setCompleted] = useState(false);

  const handleComplete = useCallback(() => {
    setCompleted(true);
    onComplete();
  }, [onComplete]);

  return (
    <div className="space-y-5 pb-24">
      <button onClick={onBack} className="btn-ghost">
        <i className="fas fa-arrow-left mr-2"></i>{t(lang, 'common.back')}
      </button>

      <div className="space-y-1">
        <div className="text-xs font-mono" style={{ color: course.color }}>{course.title}</div>
        <h1 className="text-2xl font-black display tracking-tight">{lesson.title}</h1>
        <p className="text-slate-400 text-sm">{lesson.summary}</p>
      </div>

      <div className="card p-6 space-y-4">
        {lesson.content.map((block, i) => <LessonBlockView key={i} block={block} lang={lang} />)}
      </div>

      {completed ? (
        <div className="card p-6 text-center space-y-3 ring-pop">
          <div className="text-5xl">🎉</div>
          <div className="text-xl font-black display">{t(lang, 'academy.lessonComplete')}</div>
          <div className="text-violet-400 text-sm font-mono">+{lesson.xp} XP</div>
          <button onClick={onBack} className="btn-primary mx-auto">
            {lang === 'pt-BR' ? 'Voltar para o curso' : 'Back to course'}
          </button>
        </div>
      ) : (
        <button onClick={handleComplete} className="btn-primary w-full">
          <i className="fas fa-check mr-2"></i>{lang === 'pt-BR' ? 'Concluir aula' : 'Complete lesson'}
        </button>
      )}
    </div>
  );
}

function LessonBlockView({ block, lang }: { block: LessonBlock; lang: 'pt-BR' | 'en' }) {
  switch (block.kind) {
    case 'heading':
      return <h3 className="text-lg font-bold display text-violet-300 pt-2">{block.text}</h3>;
    case 'paragraph':
      return <p className="text-sm text-slate-200 leading-relaxed">{block.text}</p>;
    case 'tip':
      return (
        <div className="bg-cyan-500/10 border-l-2 border-cyan-500 p-3 rounded-r-lg">
          <div className="flex gap-2">
            <span className="text-cyan-400 text-sm">💡</span>
            <p className="text-sm text-cyan-100 leading-relaxed">{block.text}</p>
          </div>
        </div>
      );
    case 'list':
      return (
        <ul className="space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="text-sm text-slate-300 flex gap-2">
              <span className="text-violet-400">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'audio':
      return (
        <div className="bg-white/5 p-4 rounded-xl space-y-2">
          <div className="text-xs text-slate-400 font-mono">{block.label}</div>
          <button
            onClick={async () => { await ensureAudioStarted(); playNote(block.midi, block.durationMs); }}
            className="btn-ghost"
          >
            <i className="fas fa-play mr-2"></i>{midiToNoteName(block.midi)}
          </button>
        </div>
      );
    default:
      return null;
  }
}
