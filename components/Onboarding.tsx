import React, { useState } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import type { Language, StudentLevel } from '../types';

interface OnboardingProps {
  onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
  const { profile, updateSettings, touchStreak } = useStore();
  const lang = profile.settings.language;
  const [step, setStep] = useState(0);
  const [micOk, setMicOk] = useState(false);
  const pitch = usePitchDetection({ a4: profile.settings.a4 });

  const steps = [
    // 0: welcome
    {
      title: t(lang, 'onb.welcome'),
      desc: t(lang, 'onb.welcomeDesc'),
      body: (
        <div className="text-center space-y-6">
          <div className="text-7xl ring-pop">🎤</div>
          <p className="text-slate-300 leading-relaxed max-w-md mx-auto">{t(lang, 'onb.welcomeDesc')}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
            <span>{t(lang, 'onb.step')} {step + 1} {t(lang, 'onb.of')} 4</span>
          </div>
        </div>
      ),
    },
    // 1: language
    {
      title: t(lang, 'onb.lang.title'),
      desc: '',
      body: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {(['pt-BR', 'en'] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => updateSettings({ language: l })}
                className={`p-6 rounded-2xl border-2 transition-all ${lang === l ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 hover:border-white/20'}`}
              >
                <div className="text-3xl mb-2">{l === 'pt-BR' ? '🇧🇷' : '🇺🇸'}</div>
                <div className="text-sm font-bold">{l === 'pt-BR' ? 'Português' : 'English'}</div>
              </button>
            ))}
          </div>
        </div>
      ),
    },
    // 2: level
    {
      title: t(lang, 'onb.level.title'),
      desc: t(lang, 'onb.level.desc'),
      body: (
        <div className="space-y-3">
          {([
            { v: 'beginner',     label: t(lang, 'settings.level.beginner'),     icon: '🌱' },
            { v: 'intermediate', label: t(lang, 'settings.level.intermediate'), icon: '🔥' },
            { v: 'advanced',     label: t(lang, 'settings.level.advanced'),     icon: '💎' },
          ] as { v: StudentLevel; label: string; icon: string }[]).map(opt => (
            <button
              key={opt.v}
              onClick={() => updateSettings({ level: opt.v })}
              className={`w-full p-5 rounded-2xl border-2 flex items-center gap-4 transition-all ${profile.settings.level === opt.v ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 hover:border-white/20'}`}
            >
              <span className="text-3xl">{opt.icon}</span>
              <span className="text-base font-bold flex-1 text-left">{opt.label}</span>
              {profile.settings.level === opt.v && <span className="text-cyan-400"><i className="fas fa-check-circle"></i></span>}
            </button>
          ))}
        </div>
      ),
    },
    // 3: mic
    {
      title: t(lang, 'onb.mic.title'),
      desc: t(lang, 'onb.mic.desc'),
      body: (
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="text-6xl">🎙️</div>
            <p className="text-slate-300 text-sm leading-relaxed">{t(lang, 'onb.mic.desc')}</p>
          </div>
          {micOk && pitch.isListening && pitch.currentFrame && (
            <div className="card p-6 text-center space-y-2">
              <div className="text-4xl font-black neon-text font-mono">{pitch.currentFrame.noteName}</div>
              <div className="text-xs text-slate-400">{pitch.currentFrame.frequency.toFixed(1)} Hz · {pitch.currentFrame.cents} cents</div>
              <div className="text-xs text-green-400 font-mono">✓ {lang === 'pt-BR' ? 'Microfone funcionando' : 'Microphone working'}</div>
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
            <div className="text-center text-sm text-slate-400">{lang === 'pt-BR' ? 'Tudo pronto!' : 'All set!'}</div>
          )}
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      pitch.stop();
      touchStreak();
      onDone();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md card p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">{current.title}</h1>
          {current.desc && <p className="text-slate-400 text-sm mt-1">{current.desc}</p>}
        </div>
        {current.body}
        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="btn-ghost flex-1">
              {t(lang, 'common.back')}
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={step === 3 && !micOk}
            className="btn-primary flex-1"
          >
            {isLast ? t(lang, 'onb.finish') : t(lang, 'common.next')}
          </button>
        </div>
        {step > 0 && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
            <span>{t(lang, 'onb.step')} {step + 1} {t(lang, 'onb.of')} {steps.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}
