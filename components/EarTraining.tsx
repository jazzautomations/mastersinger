import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { t } from '../i18n/strings';
import { makeEarQuestion } from '../data/earQuestions';
import { playNote, playChord, playSequence, ensureAudioStarted } from '../services/audioService';
import type { EarQuestion, EarQuestionType } from '../types';

export function EarTraining() {
  const { profile, unlockBadge, addXp, touchStreak } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const level = profile.settings.level;

  const [selectedType, setSelectedType] = useState<EarQuestionType | null>(null);
  const [question, setQuestion] = useState<EarQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [streak, setStreak] = useState(0);

  const types: { type: EarQuestionType; icon: string; titleKey: string }[] = [
    { type: 'interval-melodic', icon: '🎵', titleKey: 'ear.intervalMelodic' },
    { type: 'interval-harmonic', icon: '🎹', titleKey: 'ear.intervalHarmonic' },
    { type: 'scale-identify',   icon: '🪜', titleKey: 'ear.scaleIdentify' },
    { type: 'chord-identify',   icon: '🎼', titleKey: 'ear.chordIdentify' },
  ];

  const startQuestion = useCallback((type: EarQuestionType) => {
    const seed = Math.random() * 1000;
    const q = makeEarQuestion(type, level, seed);
    setQuestion(q);
    setSelectedAnswer(null);
    setShowResult(false);
  }, [level]);

  useEffect(() => {
    if (question) {
      playQuestion();
    }
  }, [question]);

  const playQuestion = useCallback(async () => {
    if (!question) return;
    await ensureAudioStarted();
    const seq = question.audioSequence;
    if (question.type === 'interval-harmonic' || question.type === 'chord-identify') {
      // play all notes simultaneously as a chord
      const midis = seq.map(s => s.midi);
      playChord(midis, seq[0].durationMs, a4);
    } else {
      playSequence(seq.map(s => s.midi), s => seq[0].durationMs, a4);
      // simpler: just play each note in turn
      seq.forEach((s, i) => {
        setTimeout(() => playNote(s.midi, s.durationMs * 0.9, 0, a4), seq.slice(0, i).reduce((a, b) => a + b.durationMs, 0));
      });
    }
  }, [question, a4]);

  const handleAnswer = (answer: string) => {
    if (!question || showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    const correct = answer === question.answer;
    if (correct) {
      addXp(question.xp);
      touchStreak();
      if (!profile.badges.includes('first-ear')) unlockBadge('first-ear');
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak >= 10 && !profile.badges.includes('ear-streak-10')) unlockBadge('ear-streak-10');
    } else {
      setStreak(0);
    }
  };

  const next = () => {
    if (selectedType) startQuestion(selectedType);
  };

  // ── Type selection ──
  if (!selectedType) {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'ear.title')}</h1>
          <p className="text-slate-400 text-sm">{t(lang, 'ear.subtitle')}</p>
        </div>
        <div className="grid gap-3">
          {types.map(({ type, icon, titleKey }) => (
            <button
              key={type}
              onClick={() => { setSelectedType(type); startQuestion(type); }}
              className="card p-5 text-left hover:border-violet-500/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{icon}</span>
                <div className="flex-1">
                  <div className="text-base font-bold">{t(lang, titleKey)}</div>
                </div>
                <span className="text-violet-400"><i className="fas fa-chevron-right"></i></span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Question ──
  if (!question) return null;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black display tracking-tight">{t(lang, types.find(x => x.type === selectedType)!.titleKey)}</h1>
          <div className="text-xs text-slate-400 font-mono">{lang === 'pt-BR' ? 'Sequência' : 'Streak'}: {streak} 🔥</div>
        </div>
        <button onClick={() => { setSelectedType(null); setQuestion(null); setStreak(0); }} className="btn-ghost">
          {t(lang, 'common.back')}
        </button>
      </div>

      {/* Question */}
      <div className="card p-6 space-y-4 text-center">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'ear.question')}</div>
        <button onClick={playQuestion} className="btn-primary mx-auto">
          <i className="fas fa-volume-up mr-2"></i>{t(lang, 'ear.replay')}
        </button>
      </div>

      {/* Options */}
      <div className="grid gap-2">
        {question.options.map(opt => {
          const isSelected = selectedAnswer === opt;
          const isCorrect = opt === question.answer;
          let cls = 'bg-white/5 hover:bg-white/10';
          if (showResult) {
            if (isCorrect) cls = 'bg-green-500/20 border border-green-400';
            else if (isSelected) cls = 'bg-red-500/20 border border-red-400';
            else cls = 'bg-white/5 opacity-50';
          }
          return (
            <button
              key={opt}
              onClick={() => handleAnswer(opt)}
              disabled={showResult}
              className={`p-4 rounded-xl text-left transition-all ${cls}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{opt}</span>
                {showResult && isCorrect && <span className="text-green-400">✓</span>}
                {showResult && isSelected && !isCorrect && <span className="text-red-400">✗</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Result */}
      {showResult && (
        <div className="card p-5 text-center space-y-3">
          <div className={`text-2xl font-black ${selectedAnswer === question.answer ? 'text-green-400' : 'text-red-400'}`}>
            {selectedAnswer === question.answer ? t(lang, 'ear.correct') : `${t(lang, 'ear.incorrect')} ${question.answer}`}
          </div>
          {selectedAnswer === question.answer && (
            <div className="text-sm text-violet-400">+{question.xp} XP</div>
          )}
          <button onClick={next} className="btn-primary mx-auto">
            {lang === 'pt-BR' ? 'Próxima pergunta' : 'Next question'} <i className="fas fa-arrow-right ml-2"></i>
          </button>
        </div>
      )}
    </div>
  );
}
