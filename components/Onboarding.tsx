import React, { useState } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import type { StudentLevel } from '../types';
import { VoiceRangeTest } from './VoiceRangeTest';

const MUSICAL_STYLES = [
  'Pop', 'MPB', 'Sertanejo', 'Gospel', 'Rock',
  'Forró', 'Bossa Nova', 'Clássico', 'K-Pop', 'Funk',
];

interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  const { profile, updateSettings, touchStreak } = useStore();
  const lang = profile.settings.language;
  const [step, setStep] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const pitch = usePitchDetection({ a4: profile.settings.a4, micSensitivity: profile.settings.micSensitivity ?? 0.5, noiseGate: profile.settings.noiseGate ?? 0.02 });

  // ── Onboarding answers ──
  const [singsAlready, setSingsAlready] = useState<boolean | null>(null);
  const [singingTime, setSingingTime] = useState('');
  const [favoriteStyles, setFavoriteStyles] = useState<string[]>([]);
  const [hadLessons, setHadLessons] = useState<boolean | null>(null);
  const [lessonsTime, setLessonsTime] = useState('');

  const totalSteps = 6;

  const toggleStyle = (style: string) => {
    setFavoriteStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const saveAnswers = () => {
    updateSettings({
      onboarding: {
        singsAlready: singsAlready ?? undefined,
        singingTime: singingTime || undefined,
        favoriteStyles: favoriteStyles.length > 0 ? favoriteStyles : undefined,
        hadLessons: hadLessons ?? undefined,
        lessonsTime: lessonsTime || undefined,
      },
    });
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      saveAnswers();
      pitch.stop();
      touchStreak();
      onDone();
    }
  };

  const handleSkip = () => {
    saveAnswers();
    pitch.stop();
    touchStreak();
    onDone();
  };

  const renderStep = () => {
    switch (step) {
      case 0: // Welcome
        return (
          <div className="text-center space-y-6">
            <div className="text-7xl ring-pop">🎤</div>
            <p className="text-slate-300 leading-relaxed max-w-md mx-auto">
              {t(lang, 'onb.welcomeDesc')}
            </p>
          </div>
        );

      case 1: // Sing already?
        return (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black display">{t(lang, 'onb.singsTitle')}</h2>
              <p className="text-sm text-slate-400">{t(lang, 'onb.singsDesc')}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setSingsAlready(true)}
                className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${singsAlready === true ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 hover:border-white/20'}`}
              >
                <span className="text-3xl">🎵</span>
                <span className="text-base font-bold flex-1 text-left">{t(lang, 'onb.singsYes')}</span>
                {singsAlready === true && <span className="text-cyan-400"><i className="fas fa-check-circle"></i></span>}
              </button>
              <button
                onClick={() => { setSingsAlready(false); setSingingTime(''); }}
                className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${singsAlready === false ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 hover:border-white/20'}`}
              >
                <span className="text-3xl">🌱</span>
                <span className="text-base font-bold flex-1 text-left">{t(lang, 'onb.singsNo')}</span>
                {singsAlready === false && <span className="text-cyan-400"><i className="fas fa-check-circle"></i></span>}
              </button>
            </div>
            {singsAlready === true && (
              <div className="space-y-2 mt-4">
                <div className="text-xs text-slate-400 font-mono">{t(lang, 'onb.singsTime')}</div>
                <div className="grid grid-cols-2 gap-2">
                  {t(lang, 'onb.singsTimeOptions').split('|').map(opt => (
                    <button
                      key={opt}
                      onClick={() => setSingingTime(opt)}
                      className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${singingTime === opt ? 'border-violet-500 bg-violet-500/10 text-violet-200' : 'border-white/10 hover:border-white/20 text-slate-300'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 2: // Musical styles
        return (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black display">{t(lang, 'onb.stylesTitle')}</h2>
              <p className="text-sm text-slate-400">{t(lang, 'onb.stylesDesc')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {MUSICAL_STYLES.map(style => (
                <button
                  key={style}
                  onClick={() => toggleStyle(style)}
                  className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${favoriteStyles.includes(style) ? 'border-violet-500 bg-violet-500/10 text-violet-200' : 'border-white/10 hover:border-white/20 text-slate-300'}`}
                >
                  {favoriteStyles.includes(style) && <span className="mr-1.5">✓</span>}
                  {style}
                </button>
              ))}
            </div>
          </div>
        );

      case 3: // Vocal lessons
        return (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black display">{t(lang, 'onb.lessonsTitle')}</h2>
              <p className="text-sm text-slate-400">{t(lang, 'onb.lessonsDesc')}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setHadLessons(true)}
                className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${hadLessons === true ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 hover:border-white/20'}`}
              >
                <span className="text-3xl">🎓</span>
                <span className="text-base font-bold flex-1 text-left">{t(lang, 'onb.lessonsYes')}</span>
                {hadLessons === true && <span className="text-cyan-400"><i className="fas fa-check-circle"></i></span>}
              </button>
              <button
                onClick={() => { setHadLessons(false); setLessonsTime(''); }}
                className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${hadLessons === false ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 hover:border-white/20'}`}
              >
                <span className="text-3xl">🎤</span>
                <span className="text-base font-bold flex-1 text-left">{t(lang, 'onb.lessonsNo')}</span>
                {hadLessons === false && <span className="text-cyan-400"><i className="fas fa-check-circle"></i></span>}
              </button>
            </div>
            {hadLessons === true && (
              <div className="space-y-2 mt-4">
                <div className="text-xs text-slate-400 font-mono">{t(lang, 'onb.lessonsTime')}</div>
                <div className="grid grid-cols-2 gap-2">
                  {t(lang, 'onb.lessonsTimeOptions').split('|').map(opt => (
                    <button
                      key={opt}
                      onClick={() => setLessonsTime(opt)}
                      className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${lessonsTime === opt ? 'border-violet-500 bg-violet-500/10 text-violet-200' : 'border-white/10 hover:border-white/20 text-slate-300'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 4: // Microphone test
        return (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black display">{t(lang, 'onb.mic.title')}</h2>
              <p className="text-sm text-slate-400">{t(lang, 'onb.mic.desc')}</p>
            </div>
            <div className="text-center space-y-3">
              <div className="text-6xl">🎙️</div>
            </div>
            {micOk && pitch.isListening && pitch.currentFrame && (
              <div className="card p-6 text-center space-y-2">
                <div className="text-4xl font-black neon-text font-mono">{pitch.currentFrame.noteName}</div>
                <div className="text-xs text-slate-400">{pitch.currentFrame.frequency.toFixed(1)} Hz · {pitch.currentFrame.cents} cents</div>
                <div className="text-xs text-green-400 font-mono">{t(lang, 'onb.micOk')}</div>
              </div>
            )}
            {pitch.error && (
              <div className="text-center text-red-400 text-sm">{pitch.error}</div>
            )}
            {!micOk ? (
              <button
                onClick={async () => {
                  await pitch.start();
                  setTimeout(() => setMicOk(true), 500);
                }}
                className="btn-primary w-full"
              >
                {t(lang, 'onb.mic.allow')}
              </button>
            ) : (
              <div className="text-center text-sm text-green-400">{t(lang, 'onb.allReady')}</div>
            )}
          </div>
        );

      case 5: // Voice range test
        return (
          <VoiceRangeTest
            mode="onboarding"
            onComplete={() => {
              // Range saved inside VoiceRangeTest via updateRange
              handleNext();
            }}
            onSkip={() => handleNext()}
          />
        );

      default:
        return null;
    }
  };

  const canProceed = step === 4 ? micOk : true;
  const isLast = step === totalSteps - 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md card p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">
            {step === 0 ? t(lang, 'onb.welcome') : ''}
          </h1>
        </div>

        {renderStep()}

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="btn-ghost flex-1">
              {t(lang, 'common.back')}
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className="btn-primary flex-1 disabled:opacity-40"
          >
            {isLast ? t(lang, 'onb.finish') : t(lang, 'common.next')}
          </button>
        </div>

        {step > 0 && step < totalSteps - 1 && (
          <button onClick={handleSkip} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-all">
            {t(lang, 'onb.skip')}
          </button>
        )}

        {step > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
            <span>{t(lang, 'onb.step')} {step + 1} {t(lang, 'onb.of')} {totalSteps}</span>
          </div>
        )}
      </div>
    </div>
  );
}
