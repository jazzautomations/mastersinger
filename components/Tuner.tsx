import { useRef, useEffect, useState } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { NOTE_NAMES_SHARP, midiToFrequency } from '../services/theoryService';
import { playDrone, stopDrone, ensureAudioStarted } from '../services/audioService';
import { PitchMeter } from '../components/PitchMeter';
import type { PitchFrame } from '../types';

// Reference tones offered in the tuner (C4..A4 span — comfortable singing range).
const REFERENCE_NOTES = [
  { midi: 60, label: 'C4' },
  { midi: 64, label: 'E4' },
  { midi: 67, label: 'G4' },
  { midi: 69, label: 'A4' },
];

export function Tuner() {
  const { profile, unlockBadge: unlock, updateRange } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;

  // ── Precision tuning for the TUNER (not the studio): a larger analysis
  //    window (8192 ≈ 186 ms) gives YIN more periods to average → fewer octave
  //    errors on low notes and a steadier cents reading, at the cost of latency
  //    a tuner can absorb. A lower voiced gate (0.35 vs the smoother's 0.45
  //    default) keeps the needle alive on ordinary laptop/phone mics instead
  //    of dropping to "no signal" the moment the room isn't silent. ──
  const pitch = usePitchDetection({ a4, record: true, bufferSize: 8192, minConfidence: 0.35 });

  const [refMidi, setRefMidi] = useState<number>(69);
  const [refPlaying, setRefPlaying] = useState<boolean>(false);

  // ── Range tracking: keep the lowest/highest CONFIDENT midi seen this session
  //    in refs (no per-frame profile writes — that would re-render the whole
  //    tree at 60fps) and flush to the store once when listening stops. This is
  //    what makes the Progress range card, voice-type classification and
  //    range-aware exercise transposition actually work. ──
  const rangeLowRef = useRef<number | null>(null);
  const rangeHighRef = useRef<number | null>(null);
  const lastFrameRef = useRef<PitchFrame | null>(null);

  // ── Stability: a short rolling buffer of recent cents, surfaced as a % so
  //    the singer can SEE "precise and steady" vs "shaky" — directly the
  //    "precisão" the user asked for. ──
  const centsHistoryRef = useRef<number[]>([]);
  const lastVoicedRef = useRef<{ note: string; cents: number; freq: number; conf: number; midi: number } | null>(null);
  const voicedStreakRef = useRef(0);
  const silentStreakRef = useRef(0);

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

  // ── Track range + stability from each voiced frame. Refs only → zero
  //    re-render cost; the range is flushed to the store when listening ends. ──
  useEffect(() => {
    const f = pitch.currentFrame;
    lastFrameRef.current = f;
    if (!f || f.frequency <= 0 || f.confidence < 0.5) return;
    const m = Math.round(f.midi);
    if (rangeLowRef.current == null || m < rangeLowRef.current) rangeLowRef.current = m;
    if (rangeHighRef.current == null || m > rangeHighRef.current) rangeHighRef.current = m;
    // rolling cents history (last ~1.5s of frames) for the stability readout
    const hist = centsHistoryRef.current;
    hist.push(f.cents);
    if (hist.length > 90) hist.shift();
  }, [pitch.currentFrame]);

  // ── Flush the detected range to the store when the user stops listening. ──
  useEffect(() => {
    if (pitch.isListening) return;
    const lo = rangeLowRef.current;
    const hi = rangeHighRef.current;
    if (lo != null && hi != null && hi >= lo) {
      updateRange(lo, hi);
    }
    rangeLowRef.current = null;
    rangeHighRef.current = null;
    centsHistoryRef.current = [];
  }, [pitch.isListening, updateRange]);

  // ── Fractional cents from the (already EMA-smoothed) float midi → sub-cent
  //    precision for the needle + readout, instead of the integer cents that
  //    made the display jump in 1-cent steps. ──
  const frame = pitch.currentFrame;
  const voicedNow = !!frame && frame.frequency > 0 && frame.confidence > 0.35;
  if (voicedNow && frame) {
    voicedStreakRef.current += 1;
    silentStreakRef.current = 0;
    if (!lastVoicedRef.current || voicedStreakRef.current >= 2 || Math.abs(frame.cents) <= 35) {
      lastVoicedRef.current = { note: frame.noteName, cents: frame.cents, freq: frame.frequency, conf: frame.confidence, midi: frame.midi };
    }
  } else {
    silentStreakRef.current += 1;
    voicedStreakRef.current = 0;
  }
  const stable = lastVoicedRef.current && (voicedNow || silentStreakRef.current <= 2) ? lastVoicedRef.current : null;
  const cents = stable ? Math.round(stable.cents * 10) / 10 : 0;
  const note = stable?.note ?? '—';
  const freq = stable?.freq ?? 0;
  const conf = stable?.conf ?? 0;
  const color = !voicedNow ? 'text-slate-500'
    : Math.abs(cents) < 10 ? 'text-green-400'
    : Math.abs(cents) < 25 ? 'text-amber-400' : 'text-red-400';

  // Stability %: 100 minus the spread of the recent cents (MAD * 6, capped).
  // A held, dead-center note reads ~100%; a wavering one drops toward 0%.
  const hist = centsHistoryRef.current;
  const med = hist.length ? [...hist].sort((a, b) => a - b)[Math.floor(hist.length / 2)] : 0;
  const mad = hist.length ? hist.reduce((s, c) => s + Math.abs(c - med), 0) / hist.length : 0;
  const stability = Math.max(0, Math.min(100, Math.round(100 - mad * 6)));

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'tuner.title')}</h1>
        <p className="text-slate-400 text-sm">{t(lang, 'tuner.subtitle')}</p>
      </div>

      {/* Big note display */}
      <div className="card p-8 text-center space-y-2">
        <div className={`text-7xl font-black font-mono ${color} ${voicedNow ? 'pulse-soft' : ''}`}>
          {voicedNow ? note : '—'}
        </div>
        <div className="text-sm text-slate-400 font-mono">
          {voicedNow ? `${freq.toFixed(1)} Hz` : t(lang, 'tuner.noSignal')}
        </div>
      </div>

      {/* Cents gauge */}
      <div className="card p-6 space-y-4">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">{t(lang, 'tuner.cents')}</span>
          <span className={`text-2xl font-black font-mono ${color}`}>
            {voicedNow ? `${cents > 0 ? '+' : ''}${cents.toFixed(1)}` : '0.0'}
          </span>
        </div>
        <div className="relative h-4 rounded-full gauge-bg overflow-hidden">
          {/* needle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
            style={{
              left: `${Math.max(0, Math.min(100, ((cents + 50) / 100) * 100))}%`,
              transform: 'translateX(-50%)',
              transition: 'left 60ms linear',
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

      {/* Precision readouts — confidence, stability (precisão), mic level */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">
            {lang === 'pt-BR' ? 'Confiança' : 'Confidence'}
          </div>
          <div className="text-xl font-black font-mono neon-text">{(conf * 100).toFixed(0)}%</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">
            {lang === 'pt-BR' ? 'Estabilidade' : 'Stability'}
          </div>
          <div className={`text-xl font-black font-mono ${stability >= 80 ? 'text-green-400' : stability >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {voicedNow ? `${stability}%` : '—'}
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">
            {lang === 'pt-BR' ? 'Nível mic' : 'Mic level'}
          </div>
          <div className="text-xl font-black font-mono neon-text">{(pitch.micLevel * 100).toFixed(0)}</div>
        </div>
      </div>

      {/* ── Review: ouça sua própria voz ── */}
      {pitch.recordingUrl && (
        <div className="card p-5 space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
            {lang === 'pt-BR' ? 'Ouça sua voz 🎧' : 'Listen to your voice 🎧'}
          </div>
          <audio src={pitch.recordingUrl} controls className="w-full" />
          <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
            <span>{lang === 'pt-BR' ? 'Duração' : 'Duration'}: {(pitch.recordingDurationMs / 1000).toFixed(1)}s</span>
            <button onClick={pitch.clearRecording} className="text-slate-400 hover:text-red-400 underline">
              {lang === 'pt-BR' ? 'Apagar gravação' : 'Delete recording'}
            </button>
          </div>
        </div>
      )}

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
