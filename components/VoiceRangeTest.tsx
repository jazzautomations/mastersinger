import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { playNote, stopAll, ensureAudioStarted } from '../services/audioService';
import { midiToNoteName, classifyVoiceType } from '../services/theoryService';
import type { VoiceType } from '../types';

const DESC_NOTES = [69, 67, 65, 64, 62, 60, 59, 57, 55, 53, 52, 50, 48];
const ASC_NOTES = [69, 71, 72, 74, 76, 77, 79, 81, 83, 84];

const VOICE_LABELS: Record<VoiceType, { pt: string; en: string; icon: string }> = {
  soprano:  { pt: 'Soprano',       en: 'Soprano',       icon: '🎵' },
  mezzo:    { pt: 'Mezzo-soprano',  en: 'Mezzo-soprano',  icon: '🎶' },
  alto:     { pt: 'Contralto',     en: 'Contralto',     icon: '🎼' },
  tenor:    { pt: 'Tenor',         en: 'Tenor',         icon: '🎤' },
  baritone: { pt: 'Barítono',      en: 'Baritone',      icon: '🔊' },
  bass:     { pt: 'Baixo',         en: 'Bass',          icon: '🔈' },
  unknown:  { pt: 'Desconhecido',  en: 'Unknown',       icon: '❓' },
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
  const [hitFlash, setHitFlash] = useState<'hit' | 'miss' | null>(null);
  const [selectedVoiceType, setSelectedVoiceType] = useState<VoiceType>('unknown');
  const [showQuestion, setShowQuestion] = useState(false);
  const [detectedByMic, setDetectedByMic] = useState(false);
  const [waitingForSing, setWaitingForSing] = useState(false);

  const currentNoteIdxRef = useRef(0);
  const phaseRef = useRef<TestPhase>(phase);
  const detectedNotesRef = useRef<number[]>([]);
  const hitStreakRef = useRef(0);
  const listenTimeoutRef = useRef<number | null>(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const pitch = usePitchDetection({
    a4,
    record: false,
    micSensitivity,
    noiseGate,
    onFrame: (frame) => {
      if (!waitingForSing) return;
      if (phaseRef.current !== 'descending' && phaseRef.current !== 'ascending') return;
      if (frame.frequency <= 0 || frame.confidence < 0.35) {
        hitStreakRef.current = 0;
        return;
      }

      const notes = phaseRef.current === 'descending' ? DESC_NOTES : ASC_NOTES;
      const idx = currentNoteIdxRef.current;
      if (idx >= notes.length) return;

      const targetMidi = notes[idx];
      const centsDev = Math.abs((frame.midi - targetMidi) * 100);
      const semitoneDiff = Math.abs(Math.round(frame.midi) - targetMidi);

      // Accept ±2 semitones
      if (semitoneDiff <= 2 && centsDev < 250) {
        hitStreakRef.current++;
      } else {
        hitStreakRef.current = 0;
      }

      // Detected! Stop listening and show question
      if (hitStreakRef.current >= 5) {
        setDetectedByMic(true);
        setWaitingForSing(false);
        setShowQuestion(true);
        hitStreakRef.current = 0;
        pitch.stop();
      }
    },
  });

  const playReferenceAndListen = useCallback(async () => {
    const notes = phaseRef.current === 'descending' ? DESC_NOTES : ASC_NOTES;
    const idx = currentNoteIdxRef.current;
    if (idx >= notes.length) return;

    setDetectedByMic(false);
    setShowQuestion(false);
    setWaitingForSing(false);

    // 1. Stop mic + silence everything FIRST
    pitch.stop();
    stopAll();

    // 2. Play reference note (mic is OFF, so no bleed)
    await ensureAudioStarted();
    playNote(notes[idx], 400, 0, a4);

    // 3. Wait for note to finish playing + decay (400ms + 300ms buffer)
    const listenTimeout = window.setTimeout(async () => {
      // 4. NOW turn on mic — reference is done, only user's voice
      setWaitingForSing(true);
      await pitch.start();
    }, 700);
    listenTimeoutRef.current = listenTimeout;
  }, [a4, pitch]);

  const handleStartTest = async () => {
    detectedNotesRef.current = [];
    setCurrentNoteIdx(0);
    currentNoteIdxRef.current = 0;
    setNoteStatuses(new Array(DESC_NOTES.length).fill('pending'));
    setPhase('descending');
    stopAll();
    setTimeout(() => playReferenceAndListen(), 300);
  };

  const handleAnswer = (hit: boolean) => {
    const notes = phaseRef.current === 'descending' ? DESC_NOTES : ASC_NOTES;
    const idx = currentNoteIdxRef.current;

    // Stop mic + cancel pending mic start
    pitch.stop();
    setWaitingForSing(false);
    if (listenTimeoutRef.current != null) {
      clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
    }

    if (hit) {
      detectedNotesRef.current.push(notes[idx]);
      setNoteStatuses(prev => { const n = [...prev]; n[idx] = 'hit'; return n; });
      setHitFlash('hit');
    } else {
      setNoteStatuses(prev => { const n = [...prev]; n[idx] = 'miss'; return n; });
      setHitFlash('miss');
    }
    setTimeout(() => setHitFlash(null), 400);

    setShowQuestion(false);
    setDetectedByMic(false);

    // Move to next note after brief pause
    setTimeout(() => {
      const nextIdx = idx + 1;
      if (nextIdx >= notes.length) {
        // Phase complete
        if (phaseRef.current === 'descending') {
          setCurrentNoteIdx(0);
          currentNoteIdxRef.current = 0;
          setNoteStatuses(new Array(ASC_NOTES.length).fill('pending'));
          setPhase('ascending');
          setTimeout(() => playReferenceAndListen(), 300);
        } else {
          finishTest();
        }
      } else {
        setCurrentNoteIdx(nextIdx);
        currentNoteIdxRef.current = nextIdx;
        setTimeout(() => playReferenceAndListen(), 300);
      }
    }, 500);
  };

  const handleSkipNote = () => {
    const notes = phaseRef.current === 'descending' ? DESC_NOTES : ASC_NOTES;
    const idx = currentNoteIdxRef.current;

    // Stop mic + cancel pending mic start + stop audio
    pitch.stop();
    setWaitingForSing(false);
    stopAll();
    if (listenTimeoutRef.current != null) {
      clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
    }

    setNoteStatuses(prev => { const n = [...prev]; n[idx] = 'miss'; return n; });
    setHitFlash('miss');
    setTimeout(() => setHitFlash(null), 400);

    setShowQuestion(false);
    setDetectedByMic(false);

    setTimeout(() => {
      const nextIdx = idx + 1;
      if (nextIdx >= notes.length) {
        if (phaseRef.current === 'descending') {
          setCurrentNoteIdx(0);
          currentNoteIdxRef.current = 0;
          setNoteStatuses(new Array(ASC_NOTES.length).fill('pending'));
          setPhase('ascending');
          setTimeout(() => playReferenceAndListen(), 300);
        } else {
          finishTest();
        }
      } else {
        setCurrentNoteIdx(nextIdx);
        currentNoteIdxRef.current = nextIdx;
        setTimeout(() => playReferenceAndListen(), 300);
      }
    }, 300);
  };

  const finishTest = useCallback(() => {
    pitch.stop();
    stopAll();
    setWaitingForSing(false);

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

  const handleUseResult = () => {
    if (lowestDetected != null && highestDetected != null) {
      updateRange(lowestDetected, highestDetected);
      onComplete(lowestDetected, highestDetected);
    }
  };

  const handleManualSelect = (vt: VoiceType) => {
    setSelectedVoiceType(vt);
    const ranges: Record<VoiceType, [number, number]> = {
      soprano:  [65, 88], mezzo: [60, 82], alto: [55, 77],
      tenor: [47, 70], baritone: [41, 64], bass: [34, 57], unknown: [50, 72],
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

  useEffect(() => {
    return () => {
      pitch.stop();
      stopAll();
      if (listenTimeoutRef.current != null) clearTimeout(listenTimeoutRef.current);
    };
  }, []);

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <div className="space-y-6 pb-8">
        <div className="text-center space-y-3">
          <div className="text-5xl">🎤</div>
          <h2 className="text-xl font-black display">{L('Teste de Tessitura', 'Voice Range Test')}</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {L('Vamos descobrir sua faixa vocal. Vou tocar uma nota, você canta, e eu pergunto se conseguiu.', "Let's find your vocal range. I'll play a note, you sing, and I'll ask how it went.")}
          </p>
        </div>
        <div className="card p-5 space-y-3 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <span className="text-lg">1.</span>
            <span>{L('Você ouve a nota de referência', 'You hear the reference note')}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">2.</span>
            <span>{L('Canta a mesma nota e segura', 'Sing the same note and hold it')}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">3.</span>
            <span>{L('Eu detecto se você acertou', 'I detect if you hit it')}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">4.</span>
            <span>{L('Você confirma se teve dificuldade', 'You confirm if you had trouble')}</span>
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
          <div className="text-[11px] text-slate-500 mt-1">
            {L(`Nota ${currentNoteIdx + 1} de ${totalInPhase}`, `Note ${currentNoteIdx + 1} of ${totalInPhase}`)}
          </div>
        </div>

        {/* Current note — big */}
        <div className={`card p-8 text-center transition-all ${hitFlash === 'hit' ? 'border-green-400/60 bg-green-500/10' : hitFlash === 'miss' ? 'border-red-400/60 bg-red-500/10' : ''}`}>
          <div className={`text-8xl font-black font-mono transition-colors ${
            hitFlash === 'hit' ? 'text-green-400' : hitFlash === 'miss' ? 'text-red-400' : 'text-white'
          }`}>
            {midiToNoteName(note)}
          </div>
          <div className={`text-xl font-mono mt-3 transition-colors ${
            hitFlash === 'hit' ? 'text-green-400' : hitFlash === 'miss' ? 'text-red-400' : 'text-slate-400'
          }`}>
            {waitingForSing
              ? L('🎤 Ouça e cante esta nota...', '🎤 Listen and sing this note...')
              : showQuestion
              ? (detectedByMic ? L('✓ Detectei sua voz!', '✓ Voice detected!') : L('🎤 Não detectei...', '🎤 Not detected...'))
              : hitFlash === 'hit' ? '✓' : hitFlash === 'miss' ? '✗' : ''
            }
          </div>
        </div>

        {/* Progress dots */}
        <div className="card p-4">
          <div className="flex justify-center gap-1.5 flex-wrap">
            {notes.map((n, i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold font-mono transition-all ${
                i === currentNoteIdx && !showQuestion ? 'bg-violet-500 text-white scale-110 ring-2 ring-violet-400/50' :
                noteStatuses[i] === 'hit' ? 'bg-green-500/30 text-green-400 border border-green-500/40' :
                noteStatuses[i] === 'miss' ? 'bg-red-500/30 text-red-400 border border-red-500/40' :
                'bg-white/5 text-slate-500 border border-white/10'
              }`}>
                {noteStatuses[i] === 'hit' ? '✓' : noteStatuses[i] === 'miss' ? '✗' : midiToNoteName(n).replace(/\d/g, '')}
              </div>
            ))}
          </div>
        </div>

        {/* Question after detection or miss */}
        {showQuestion && (
          <div className="card p-5 space-y-3">
            <div className="text-center text-sm font-bold text-slate-200">
              {detectedByMic
                ? L('Detectei que você cantou! Conseguiu manter a nota?', 'I heard you sing! Could you hold the note?')
                : L('Não consegui detectar sua voz. Tente de novo ou pule.', "I couldn't detect your voice. Try again or skip.")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleAnswer(true)} className="btn-primary !bg-green-600 hover:!bg-green-500">
                <i className="fas fa-check mr-2"></i>{L('Sim, consegui!', 'Yes, got it!')}
              </button>
              <button onClick={() => handleAnswer(false)} className="btn-ghost !border-amber-500/30">
                <i className="fas fa-exclamation-triangle mr-2"></i>{L('Teve dificuldade', 'Had trouble')}
              </button>
            </div>
            <button onClick={handleSkipNote} className="btn-ghost w-full text-xs">
              <i className="fas fa-forward mr-2"></i>{L('Pular esta nota', 'Skip this note')}
            </button>
          </div>
        )}

        {/* Controls when waiting */}
        {!showQuestion && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { pitch.stop(); setWaitingForSing(false); handleSkipNote(); }} className="btn-ghost">
              <i className="fas fa-forward mr-2"></i>{L('Pular', 'Skip')}
            </button>
            <button onClick={finishTest} className="btn-primary">
              <i className="fas fa-stop mr-2"></i>{L('Ver resultado', 'See result')}
            </button>
          </div>
        )}
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
        <button onClick={() => setPhase('manual')} className="btn-ghost w-full">
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
