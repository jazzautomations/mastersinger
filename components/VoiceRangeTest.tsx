import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { playNote, stopAll, ensureAudioStarted } from '../services/audioService';
import { midiToNoteName, classifyVoiceType } from '../services/theoryService';
import type { VoiceType } from '../types';

// ── Test scale: descend then ascend from A4 ──
const DESC_NOTES = [69, 67, 65, 64, 62, 60, 59, 57, 55, 53, 52, 50, 48]; // A4→C3
const ASC_NOTES = [69, 71, 72, 74, 76, 77, 79, 81, 83, 84];               // A4→C6

const VOICE_LABELS: Record<VoiceType, { pt: string; en: string; icon: string }> = {
  soprano:  { pt: 'Soprano',     en: 'Soprano',      icon: '🎵' },
  mezzo:    { pt: 'Mezzo-soprano', en: 'Mezzo-soprano', icon: '🎶' },
  alto:     { pt: 'Contralto',   en: 'Contralto',    icon: '🎼' },
  tenor:    { pt: 'Tenor',       en: 'Tenor',        icon: '🎤' },
  baritone: { pt: 'Barítono',    en: 'Baritone',     icon: '🔊' },
  bass:     { pt: 'Baixo',       en: 'Bass',         icon: '🔈' },
  unknown:  { pt: 'Desconhecido', en: 'Unknown',      icon: '❓' },
};

interface VoiceRangeTestProps {
  mode: 'onboarding' | 'settings';
  onComplete: (lowestMidi: number, highestMidi: number) => void;
  onSkip?: () => void;
}

type TestPhase = 'intro' | 'descending' | 'ascending' | 'result' | 'manual';
type NoteStatus = 'pending' | 'active' | 'hit' | 'miss';

export function VoiceRangeTest({ mode, onComplete, onSkip }: VoiceRangeTestProps) {
  const { profile, updateRange } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const micSensitivity = profile.settings.micSensitivity ?? 0.5;
  const noiseGate = profile.settings.noiseGate ?? 0.02;

  const [phase, setPhase] = useState<TestPhase>('intro');
  const [currentNoteIdx, setCurrentNoteIdx] = useState(0);
  const [noteStatuses, setNoteStatuses] = useState<NoteStatus[]>([]);
  const [lowestDetected, setLowestDetected] = useState<number | null>(null);
  const [highestDetected, setHighestDetected] = useState<number | null>(null);
  const [consecutiveMisses, setConsecutiveMisses] = useState(0);
  const [hitFlash, setHitFlash] = useState<'hit' | 'miss' | null>(null);
  const [selectedVoiceType, setSelectedVoiceType] = useState<VoiceType>('unknown');

  const currentNoteIdxRef = useRef(0);
  const hitStreakRef = useRef(0);
  const consecutiveMissesRef = useRef(0);
  const phaseRef = useRef<TestPhase>(phase);
  const detectedNotesRef = useRef<number[]>([]);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const pitch = usePitchDetection({
    a4,
    record: false,
    micSensitivity,
    noiseGate,
    onFrame: (frame) => {
      if (phaseRef.current !== 'descending' && phaseRef.current !== 'ascending') return;
      if (frame.frequency <= 0 || frame.confidence < 0.35) {
        hitStreakRef.current = 0;
        return;
      }

      const notes = phaseRef.current === 'descending' ? DESC_NOTES : ASC_NOTES;
      const idx = currentNoteIdxRef.current;
      if (idx >= notes.length) return;

      const targetMidi = notes[idx];
      const sungMidi = Math.round(frame.midi);
      const centsDev = Math.abs((frame.midi - targetMidi) * 100);

      // Accept ±2 semitones (200 cents) — generous for voice
      if (Math.abs(sungMidi - targetMidi) <= 1 && centsDev < 200) {
        hitStreakRef.current++;
      } else {
        hitStreakRef.current = 0;
      }

      if (hitStreakRef.current >= 5) {
        // Confirmed hit
        const midi = notes[idx];
        detectedNotesRef.current.push(midi);

        setNoteStatuses(prev => { const n = [...prev]; n[idx] = 'hit'; return n; });
        setHitFlash('hit');
        setTimeout(() => setHitFlash(null), 300);

        // Play confirmation tone
        playNote(targetMidi, 200, 0, a4);

        consecutiveMissesRef.current = 0;
        setConsecutiveMisses(0);
        hitStreakRef.current = 0;

        advanceNote();
      }
    },
  });

  const advanceNote = useCallback(() => {
    const notes = phaseRef.current === 'descending' ? DESC_NOTES : ASC_NOTES;
    const nextIdx = currentNoteIdxRef.current + 1;

    if (nextIdx >= notes.length) {
      // Phase complete
      if (phaseRef.current === 'descending') {
        // Move to ascending
        setCurrentNoteIdx(0);
        currentNoteIdxRef.current = 0;
        setNoteStatuses(new Array(ASC_NOTES.length).fill('pending'));
        setPhase('ascending');
        // Play first ascending note
        playNote(ASC_NOTES[0], 300, 0, a4);
      } else {
        // Both done → result
        finishTest();
      }
      return;
    }

    setCurrentNoteIdx(nextIdx);
    currentNoteIdxRef.current = nextIdx;

    // Play reference note
    playNote(notes[nextIdx], 300, 0, a4);
  }, [a4]);

  const handleMiss = useCallback(() => {
    consecutiveMissesRef.current++;
    setConsecutiveMisses(prev => prev + 1);

    const notes = phaseRef.current === 'descending' ? DESC_NOTES : ASC_NOTES;
    const idx = currentNoteIdxRef.current;

    setNoteStatuses(prev => { const n = [...prev]; n[idx] = 'miss'; return n; });
    setHitFlash('miss');
    setTimeout(() => setHitFlash(null), 300);
    hitStreakRef.current = 0;

    // 3 consecutive misses → stop this phase
    if (consecutiveMissesRef.current >= 3) {
      if (phaseRef.current === 'descending') {
        finishTest();
      } else {
        finishTest();
      }
      return;
    }

    // Retry same note
    playNote(notes[idx], 300, 0, a4);
  }, [a4]);

  const finishTest = useCallback(() => {
    pitch.stop();
    stopAll();

    const detected = detectedNotesRef.current;
    if (detected.length === 0) {
      setPhase('manual');
      return;
    }

    const lo = Math.min(...detected);
    const hi = Math.max(...detected);
    setLowestDetected(lo);
    setHighestDetected(hi);
    setSelectedVoiceType(classifyVoiceType(lo, hi));
    setPhase('result');
  }, [pitch]);

  const handleStartTest = async () => {
    await ensureAudioStarted();
    detectedNotesRef.current = [];
    consecutiveMissesRef.current = 0;
    setConsecutiveMisses(0);
    setCurrentNoteIdx(0);
    currentNoteIdxRef.current = 0;
    hitStreakRef.current = 0;
    setNoteStatuses(new Array(DESC_NOTES.length).fill('pending'));
    setPhase('descending');

    // Play first descending note
    playNote(DESC_NOTES[0], 300, 0, a4);
    await pitch.start();
  };

  const handleUseResult = () => {
    if (lowestDetected != null && highestDetected != null) {
      updateRange(lowestDetected, highestDetected);
      onComplete(lowestDetected, highestDetected);
    }
  };

  const handleManualSelect = (vt: VoiceType) => {
    setSelectedVoiceType(vt);
    // Map voice type to approximate MIDI ranges
    const ranges: Record<VoiceType, [number, number]> = {
      soprano:  [65, 88],
      mezzo:    [60, 82],
      alto:     [55, 77],
      tenor:    [47, 70],
      baritone: [41, 64],
      bass:     [34, 57],
      unknown:  [50, 72],
    };
    const [lo, hi] = ranges[vt];
    setLowestDetected(lo);
    setHighestDetected(hi);
  };

  const handleManualConfirm = () => {
    if (lowestDetected && highestDetected) {
      updateRange(lowestDetected, highestDetected);
      onComplete(lowestDetected, highestDetected);
    }
  };

  const L = (pt: string, en: string) => (lang === 'pt-BR' ? pt : en);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => { pitch.stop(); stopAll(); };
  }, []);

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div className="space-y-6 pb-8">
        <div className="text-center space-y-3">
          <div className="text-5xl">🎤</div>
          <h2 className="text-xl font-black display">{L('Teste de Tessitura', 'Voice Range Test')}</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {L('Vamos descobrir sua faixa vocal. Cante as notas que tocar — vamos descer e subir a escala.', "Let's find your vocal range. Sing the notes as we go down and up the scale.")}
          </p>
        </div>
        <div className="card p-5 space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <span className="text-lg">1.</span>
            <span>{L('Coloque fone de ouvido ou fique em ambiente silencioso', 'Use headphones or be in a quiet environment')}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">2.</span>
            <span>{L('Ouve a nota de referência e canta ela', 'Listen to the reference note and sing it')}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">3.</span>
            <span>{L('Segure a nota por ~2 segundos', 'Hold the note for ~2 seconds')}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">4.</span>
            <span>{L('Vamos descer até você não conseguir mais, depois subir', "We'll go down until you can't, then up")}</span>
          </div>
        </div>
        <button onClick={handleStartTest} className="btn-primary w-full">
          <i className="fas fa-play mr-2"></i>{L('Iniciar teste', 'Start test')}
        </button>
        {onSkip && (
          <button onClick={onSkip} className="btn-ghost w-full">{L('Pular por agora', 'Skip for now')}</button>
        )}
      </div>
    );
  }

  // ── DESCENDING / ASCENDING ──
  if (phase === 'descending' || phase === 'ascending') {
    const notes = phase === 'descending' ? DESC_NOTES : ASC_NOTES;
    const note = notes[currentNoteIdx] ?? notes[0];
    const label = phase === 'descending' ? L('Descendo a escala', 'Going down') : L('Subindo a escala', 'Going up');
    const totalInPhase = notes.length;

    return (
      <div className="space-y-5 pb-8">
        <div className="text-center">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{label}</div>
        </div>

        {/* Current note — big */}
        <div className={`card p-8 text-center transition-all ${hitFlash === 'hit' ? 'border-green-400/60 bg-green-500/10' : hitFlash === 'miss' ? 'border-red-400/60 bg-red-500/10' : ''}`}>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">
            {L(`Nota ${currentNoteIdx + 1} de ${totalInPhase}`, `Note ${currentNoteIdx + 1} of ${totalInPhase}`)}
          </div>
          <div className={`text-8xl font-black font-mono transition-colors ${
            hitFlash === 'hit' ? 'text-green-400' : hitFlash === 'miss' ? 'text-red-400' : 'text-white'
          }`}>
            {midiToNoteName(note)}
          </div>
          <div className={`text-xl font-mono mt-2 transition-colors ${
            hitFlash === 'hit' ? 'text-green-400' : hitFlash === 'miss' ? 'text-red-400' : 'text-slate-400'
          }`}>
            {hitFlash === 'hit' ? '✓' : hitFlash === 'miss' ? L('✗ Tente de novo', '✗ Try again') : L('🎤 Cante esta nota...', '🎤 Sing this note...')}
          </div>
        </div>

        {/* Progress dots */}
        <div className="card p-4">
          <div className="flex justify-center gap-1.5 flex-wrap">
            {notes.map((n, i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-all ${
                i === currentNoteIdx ? 'bg-violet-500 text-white scale-110 ring-2 ring-violet-400/50' :
                noteStatuses[i] === 'hit' ? 'bg-green-500/30 text-green-400 border border-green-500/40' :
                noteStatuses[i] === 'miss' ? 'bg-red-500/30 text-red-400 border border-red-500/40' :
                'bg-white/5 text-slate-500 border border-white/10'
              }`}>
                {noteStatuses[i] === 'hit' ? '✓' : noteStatuses[i] === 'miss' ? '✗' : midiToNoteName(n).replace(/\d/g, '')}
              </div>
            ))}
          </div>
          {consecutiveMisses > 0 && (
            <div className="text-center text-xs text-amber-400 mt-2 font-mono">
              {L(`${consecutiveMisses}/3 erros seguidos`, `${consecutiveMisses}/3 misses in a row`)}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleMiss} className="btn-ghost">
            <i className="fas fa-forward mr-2"></i>{L('Não consigo', "Can't sing it")}
          </button>
          <button onClick={finishTest} className="btn-primary">
            <i className="fas fa-stop mr-2"></i>{L('Ver resultado', 'See result')}
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (phase === 'result' && lowestDetected != null && highestDetected != null) {
    const vt = classifyVoiceType(lowestDetected, highestDetected);
    const label = VOICE_LABELS[vt];
    const rangeStr = `${midiToNoteName(lowestDetected)} → ${midiToNoteName(highestDetected)}`;
    const centerMidi = Math.round((lowestDetected + highestDetected) / 2);

    return (
      <div className="space-y-5 pb-8">
        <div className="card p-8 text-center space-y-3">
          <div className="text-5xl">{label.icon}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{L('Tessitura Detectada', 'Detected Range')}</div>
          <div className="text-3xl font-black display">{lang === 'pt-BR' ? label.pt : label.en}</div>
          <div className="text-xl font-mono text-violet-400">{rangeStr}</div>
          <div className="text-sm text-slate-400">
            {L(`Centro: ${midiToNoteName(centerMidi)} (MIDI ${centerMidi})`, `Center: ${midiToNoteName(centerMidi)} (MIDI ${centerMidi})`)}
          </div>
          <div className="text-xs text-slate-500">
            {L('Os exercícios serão transpostos para sua faixa.', 'Exercises will be transposed to your range.')}
          </div>
        </div>

        <button onClick={handleUseResult} className="btn-primary w-full">
          <i className="fas fa-check mr-2"></i>{L('Usar este range', 'Use this range')}
        </button>
        <button onClick={() => { setPhase('manual'); }} className="btn-ghost w-full">
          <i className="fas fa-sliders-h mr-2"></i>{L('Escolher manualmente', 'Choose manually')}
        </button>
        <button onClick={() => { setPhase('intro'); detectedNotesRef.current = []; }} className="btn-ghost w-full">
          <i className="fas fa-redo mr-2"></i>{L('Refazer teste', 'Retake test')}
        </button>
      </div>
    );
  }

  // ── MANUAL SELECT ──
  if (phase === 'manual') {
    const voiceTypes: VoiceType[] = ['soprano', 'mezzo', 'alto', 'tenor', 'baritone', 'bass'];
    return (
      <div className="space-y-5 pb-8">
        <div className="card p-5 space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{L('Escolha seu tipo vocal', 'Select your voice type')}</div>
          <div className="grid grid-cols-2 gap-2">
            {voiceTypes.map(vt => {
              const l = VOICE_LABELS[vt];
              return (
                <button
                  key={vt}
                  onClick={() => handleManualSelect(vt)}
                  className={`p-3 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    selectedVoiceType === vt ? 'bg-violet-500 text-white' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span>{l.icon}</span>
                  <span>{lang === 'pt-BR' ? l.pt : l.en}</span>
                </button>
              );
            })}
          </div>
        </div>

        {lowestDetected != null && highestDetected != null && (
          <div className="card p-4 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-1">{L('Range estimado', 'Estimated range')}</div>
            <div className="text-lg font-mono text-violet-400">{midiToNoteName(lowestDetected)} → {midiToNoteName(highestDetected)}</div>
          </div>
        )}

        <button onClick={handleManualConfirm} className="btn-primary w-full" disabled={selectedVoiceType === 'unknown'}>
          <i className="fas fa-check mr-2"></i>{L('Confirmar', 'Confirm')}
        </button>
        <button onClick={() => setPhase('intro')} className="btn-ghost w-full">
          <i className="fas fa-arrow-left mr-2"></i>{L('Voltar', 'Back')}
        </button>
      </div>
    );
  }

  return null;
}
