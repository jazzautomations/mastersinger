import { useRef, useEffect, useState } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { NOTE_NAMES_SHARP, midiToFrequency } from '../services/theoryService';
import { playDrone, stopDrone, ensureAudioStarted } from '../services/audioService';
import { unlockBadge } from '../store/store';
import { PitchMeter } from '../components/PitchMeter';

// Reference tones offered in the tuner (C4..A4 span — comfortable singing range).
const REFERENCE_NOTES = [
  { midi: 60, label: 'C4' },
  { midi: 64, label: 'E4' },
  { midi: 67, label: 'G4' },
  { midi: 69, label: 'A4' },
];

export function Tuner() {
  const { profile, unlockBadge: unlock } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const pitch = usePitchDetection({ a4 });

  const [refMidi, setRefMidi] = useState<number>(69);
  const [refPlaying, setRefPlaying] = useState<boolean>(false);

  const toggleRef = async () => {
    if (refPlaying) {
      stopDrone();
      setRefPlaying(false);
    } else {
      await ensureAudioStarted();
      playDrone(refMidi, a4);
      setRefPlaying(true);
    }
  };

  // stop the drone if the note changes or the component unmounts
  useEffect(() => {
    if (!refPlaying) return;
    stopDrone();
    playDrone(refMidi, a4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refMidi, a4]);
  useEffect(() => () => { stopDrone(); }, []);

  useEffect(() => {
    if (pitch.isListening && !profile.badges.includes('first-tuner')) {
      unlock('first-tuner');
    }
  }, [pitch.isListening]);

  const cents = pitch.currentFrame?.cents ?? 0;
  const note = pitch.currentFrame?.noteName ?? '—';
  const freq = pitch.currentFrame?.frequency ?? 0;
  const conf = pitch.currentFrame?.confidence ?? 0;
  const color = !pitch.currentFrame || freq === 0 ? 'text-slate-500'
    : Math.abs(cents) < 10 ? 'text-green-400'
    : Math.abs(cents) < 25 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'tuner.title')}</h1>
        <p className="text-slate-400 text-sm">{t(lang, 'tuner.subtitle')}</p>
      </div>

      {/* Big note display */}
      <div className="card p-8 text-center space-y-2">
        <div className={`text-7xl font-black font-mono ${color} ${pitch.isListening && freq > 0 ? 'pulse-soft' : ''}`}>
          {pitch.isListening && freq > 0 ? note : '—'}
        </div>
        <div className="text-sm text-slate-400 font-mono">
          {pitch.isListening && freq > 0 ? `${freq.toFixed(1)} Hz` : t(lang, 'tuner.noSignal')}
        </div>
      </div>

      {/* Cents gauge */}
      <div className="card p-6 space-y-4">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'tuner.cents')}</span>
          <span className={`text-2xl font-black font-mono ${color}`}>
            {pitch.isListening && freq > 0 ? `${cents > 0 ? '+' : ''}${cents}` : '0'}
          </span>
        </div>
        <div className="relative h-4 rounded-full gauge-bg overflow-hidden">
          {/* needle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-all duration-75"
            style={{
              left: `${Math.max(0, Math.min(100, ((cents + 50) / 100) * 100))}%`,
              transform: 'translateX(-50%)',
            }}
          />
          {/* center mark */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-white/40" style={{ left: '50%', transform: 'translateX(-50%)' }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>-50</span><span>-25</span><span>0</span><span>+25</span><span>+50</span>
        </div>
      </div>

      {/* Pitch history canvas */}
      <div className="card p-4">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">
          {lang === 'pt-BR' ? 'Histórico de afinação' : 'Pitch history'}
        </div>
        <PitchMeter
          frame={pitch.currentFrame}
          isListening={pitch.isListening}
          lang={lang}
        />
      </div>

      {/* Reference tone — tune against a selectable sustained note */}
      <div className="card p-5 space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
          {lang === 'pt-BR' ? 'Tom de referência' : 'Reference tone'}
        </div>
        <div className="flex gap-2">
          {REFERENCE_NOTES.map(n => (
            <button
              key={n.midi}
              onClick={() => setRefMidi(n.midi)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold font-mono transition-all ${refMidi === n.midi ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300'}`}
            >
              {n.label}
            </button>
          ))}
        </div>
        <button onClick={toggleRef} className={`btn-ghost w-full ${refPlaying ? '!bg-cyan-500/20 !border-cyan-400/40 !text-cyan-200' : ''}`}>
          <i className={`fas ${refPlaying ? 'fa-stop' : 'fa-volume-high'} mr-2`}></i>
          {refPlaying
            ? (lang === 'pt-BR' ? `Tocando ${midiToFrequency(refMidi, a4).toFixed(1)} Hz — parar` : `Playing ${midiToFrequency(refMidi, a4).toFixed(1)} Hz — stop`)
            : (lang === 'pt-BR' ? 'Tocar referência' : 'Play reference')}
        </button>
      </div>

      {/* Confidence / Mic level */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">
            {lang === 'pt-BR' ? 'Confiança' : 'Confidence'}
          </div>
          <div className="text-xl font-black font-mono neon-text">{(conf * 100).toFixed(0)}%</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">
            {lang === 'pt-BR' ? 'Nível do microfone' : 'Mic level'}
          </div>
          <div className="text-xl font-black font-mono neon-text">{(pitch.micLevel * 100).toFixed(0)}</div>
        </div>
      </div>

      {pitch.error && (
        <div className="card p-4 border-red-500/30 text-center text-red-400 text-sm">
          {pitch.error}
        </div>
      )}

      {/* Controls */}
      <button
        onClick={() => pitch.isListening ? pitch.stop() : pitch.start()}
        className={`btn-primary w-full ${pitch.isListening ? '!bg-gradient-to-r !from-red-500 !to-orange-500' : ''}`}
      >
        {pitch.isListening ? (
          <><i className="fas fa-stop mr-2"></i>{t(lang, 'tuner.stop')}</>
        ) : (
          <><i className="fas fa-microphone mr-2"></i>{t(lang, 'tuner.start')}</>
        )}
      </button>
    </div>
  );
}
