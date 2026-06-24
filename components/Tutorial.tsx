import { useState } from 'react';
import { useStore } from '../store/store';
import { t } from '../i18n/strings';

const TUTORIAL_KEY = 'mastersinger:tutorial-seen';

interface TutorialProps {
  onDone: () => void;
}

const STEPS = [
  { icon: '🎤', key: '1' },
  { icon: '🎙️', key: '2' },
  { icon: '💪', key: '3' },
  { icon: '🎓', key: '4' },
  { icon: '📼', key: '5' },
  { icon: '🚀', key: '6' },
];

export function markTutorialSeen() {
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch {}
}

export function hasTutorialBeenSeen(): boolean {
  try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; }
}

export function Tutorial({ onDone }: TutorialProps) {
  const { profile } = useStore();
  const lang = profile.settings.language;
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      markTutorialSeen();
      onDone();
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    markTutorialSeen();
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Content */}
      <div className="relative w-full max-w-sm space-y-8 animate-fade-in">
        {/* Skip button */}
        {!isLast && (
          <button
            onClick={handleSkip}
            className="absolute -top-2 right-0 text-xs text-slate-500 hover:text-slate-300 transition-all font-mono"
          >
            {t(lang, 'tutorial.skip')} ✕
          </button>
        )}

        {/* Spotlight card */}
        <div className="card p-8 text-center space-y-6 relative overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

          {/* Icon with ring */}
          <div className="relative">
            <div className="text-7xl ring-pop">{current.icon}</div>
            <div className="absolute -inset-4 border-2 border-violet-500/30 rounded-3xl animate-pulse pointer-events-none" />
          </div>

          {/* Title & description */}
          <div className="relative space-y-2">
            <h2 className="text-xl font-black display tracking-tight">
              {t(lang, `tutorial.${current.key}.title`)}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {t(lang, `tutorial.${current.key}.desc`)}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-violet-400 w-6' : i < step ? 'bg-violet-400/50' : 'bg-white/20'}`}
            />
          ))}
        </div>

        {/* Step counter */}
        <div className="text-center text-xs text-slate-500 font-mono">
          {step + 1} {t(lang, 'tutorial.step')} {STEPS.length}
        </div>

        {/* Next / Start button */}
        <button onClick={handleNext} className="btn-primary w-full text-sm py-3">
          {isLast ? t(lang, 'tutorial.start') : t(lang, 'tutorial.next')}
        </button>
      </div>
    </div>
  );
}
