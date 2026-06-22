import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/store';
import { usePitchDetection } from '../audio/usePitchDetection';
import { t } from '../i18n/strings';
import { playChord, playNote, ensureAudioStarted, stopAll, beginPlayback, isPlaybackActive } from '../services/audioService';
import { CHORD_TYPES, midiToNoteName, NOTE_NAMES_SHARP } from '../services/theoryService';
import type { PitchFrame } from '../types';

type Mode = 'triads' | 'progressions' | 'sing-third' | 'sing-fifth';

export function Harmony() {
  const { profile, addXp, unlockBadge } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const [mode, setMode] = useState<Mode | null>(null);

  const modes: { id: Mode; icon: string; titleKey: string }[] = [
    { id: 'triads',       icon: '🎹', titleKey: 'harmony.triadBasics' },
    { id: 'progressions', icon: '🔗', titleKey: 'harmony.progressions' },
    { id: 'sing-third',   icon: '🎤', titleKey: 'harmony.singThird' },
    { id: 'sing-fifth',   icon: '🎵', titleKey: 'harmony.singFifth' },
  ];

  if (!mode) {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'harmony.title')}</h1>
          <p className="text-slate-400 text-sm">{t(lang, 'harmony.subtitle')}</p>
        </div>
        <div className="grid gap-3">
          {modes.map(({ id, icon, titleKey }) => (
            <button key={id} onClick={() => setMode(id)} className="card p-5 text-left hover:border-violet-500/40 transition-all">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{icon}</span>
                <div className="flex-1"><div className="text-base font-bold">{t(lang, titleKey)}</div></div>
                <span className="text-violet-400"><i className="fas fa-chevron-right"></i></span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <button onClick={() => setMode(null)} className="btn-ghost">
        <i className="fas fa-arrow-left mr-2"></i>{t(lang, 'common.back')}
      </button>

      {mode === 'triads' && <TriadsExplorer lang={lang} a4={a4} />}
      {mode === 'progressions' && <ProgressionsExplorer lang={lang} a4={a4} />}
      {mode === 'sing-third' && <SingHarmonyPart lang={lang} a4={a4} interval={3} addXp={addXp} unlockBadge={unlockBadge} profile={profile} />}
      {mode === 'sing-fifth' && <SingHarmonyPart lang={lang} a4={a4} interval={4} addXp={addXp} unlockBadge={unlockBadge} profile={profile} />}
    </div>
  );
}

interface TriadsProps { lang: 'pt-BR' | 'en'; a4: number; }
function TriadsExplorer({ lang, a4 }: TriadsProps) {
  const [rootPc, setRootPc] = useState(0);
  const [chordType, setChordType] = useState('major');
  const rootMidi = 60;
  const chord = CHORD_TYPES[chordType];
  const chordMidis = chord.intervals.map(i => rootMidi + i);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black display">{t(lang, 'harmony.triadBasics')}</h2>

      <div className="card p-5 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? 'Um acorde é três ou mais notas tocadas juntas. Uma tríade é o acorde mais básico: três notas empilhadas em terças (fundamental, terça, quinta).'
            : 'A chord is three or more notes played together. A triad is the most basic chord: three notes stacked in thirds (root, third, fifth).'}</p>
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? 'Maior = tom+semitom+tom+semitom. Menor = semitom+tom+semitom+tom. Aumentado = tom+tom+tom. Diminuto = semitom+semitom+semitom.'
            : 'Major = tone+semitone+tone+semitone. Minor = semitone+tone+semitone+tone. Augmented = tone+tone+tone. Diminished = semitone+semitone+semitone.'}</p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono w-12">Root</span>
          <select value={rootPc} onChange={e => setRootPc(+e.target.value)} className="bg-white/5 px-3 py-2 rounded-lg flex-1 text-sm">
            {NOTE_NAMES_SHARP.map((n, i) => <option key={n} value={i} className="bg-slate-900">{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono w-12">Type</span>
          <select value={chordType} onChange={e => setChordType(e.target.value)} className="bg-white/5 px-3 py-2 rounded-lg flex-1 text-sm">
            {Object.entries(CHORD_TYPES).map(([k, v]) => <option key={k} value={k} className="bg-slate-900">{v.name}</option>)}
          </select>
        </div>
        <button onClick={async () => { await ensureAudioStarted(); stopAll(); playChord(chordMidis, 1500, a4); }} className="btn-primary w-full">
          <i className="fas fa-volume-up mr-2"></i>{lang === 'pt-BR' ? 'Tocar acorde' : 'Play chord'}
        </button>
        <div className="flex flex-wrap gap-2">
          {chordMidis.map(m => (
            <div key={m} className="px-3 py-2 bg-violet-500/20 rounded text-sm font-mono">{midiToNoteName(m)}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressionsExplorer({ lang, a4 }: TriadsProps) {
  const progressions: { name: string; chords: { root: number; type: keyof typeof CHORD_TYPES }[] }[] = [
    { name: 'I - IV - V - I',         chords: [{ root: 0, type: 'major' }, { root: 5, type: 'major' }, { root: 7, type: 'major' }, { root: 0, type: 'major' }] },
    { name: 'I - vi - IV - V',        chords: [{ root: 0, type: 'major' }, { root: 9, type: 'minor' }, { root: 5, type: 'major' }, { root: 7, type: 'major' }] },
    { name: 'ii - V - I',             chords: [{ root: 2, type: 'minor7' }, { root: 7, type: 'dominant7' }, { root: 0, type: 'major7' }] },
    { name: 'I - V - vi - IV (axis)', chords: [{ root: 0, type: 'major' }, { root: 7, type: 'major' }, { root: 9, type: 'minor' }, { root: 5, type: 'major' }] },
    { name: 'vi - IV - I - V',        chords: [{ root: 9, type: 'minor' }, { root: 5, type: 'major' }, { root: 0, type: 'major' }, { root: 7, type: 'major' }] },
  ];

  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; stopAll(); }, []);

  const playProgression = async () => {
    setPlaying(true);
    await ensureAudioStarted();
    const token = beginPlayback();
    const prog = progressions[selected];
    for (let i = 0; i < prog.chords.length; i++) {
      if (!mountedRef.current || !isPlaybackActive(token)) return;
      const c = prog.chords[i];
      const midis = CHORD_TYPES[c.type].intervals.map(int => 60 + c.root + int);
      playChord(midis, 1200, a4);
      await new Promise(r => setTimeout(r, 1300));
      if (!mountedRef.current || !isPlaybackActive(token)) return;
    }
    if (mountedRef.current) setPlaying(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black display">{t(lang, 'harmony.progressions')}</h2>
      <div className="card p-5 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? 'Uma progressão é uma sequência de acordes. Algumas progressões são tão comuns que definem gêneros inteiros: I-V-vi-IV domina o pop; ii-V-I domina o jazz.'
            : 'A progression is a sequence of chords. Some are so common they define entire genres: I-V-vi-IV dominates pop; ii-V-I dominates jazz.'}</p>
      </div>
      <div className="card p-5 space-y-3">
        <select value={selected} onChange={e => setSelected(+e.target.value)} className="bg-white/5 px-3 py-2 rounded-lg w-full text-sm">
          {progressions.map((p, i) => <option key={i} value={i} className="bg-slate-900">{p.name}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          {progressions[selected].chords.map((c, i) => {
            const chord = CHORD_TYPES[c.type];
            const label = NOTE_NAMES_SHARP[c.root] + chord.symbol;
            return (
              <div key={i} className="px-3 py-2 bg-violet-500/20 rounded text-sm font-mono">{label}</div>
            );
          })}
        </div>
        <button onClick={playProgression} disabled={playing} className="btn-primary w-full">
          <i className={`fas ${playing ? 'fa-spinner fa-spin' : 'fa-play'} mr-2`}></i>
          {playing ? (lang === 'pt-BR' ? 'Tocando...' : 'Playing...') : (lang === 'pt-BR' ? 'Tocar progressão' : 'Play progression')}
        </button>
      </div>
    </div>
  );
}

interface SingHarmonyProps {
  lang: 'pt-BR' | 'en';
  a4: number;
  interval: 3 | 4;  // semitones for major/minor third, or perfect fourth/fifth
  addXp: (xp: number) => void;
  unlockBadge: (id: string) => boolean;
  profile: any;
}

function SingHarmonyPart({ lang, a4, interval, addXp, unlockBadge, profile }: SingHarmonyProps) {
  const isThird = interval === 3;
  const [targetMidi, setTargetMidi] = useState(60);
  const [userMidi, setUserMidi] = useState<number | null>(null);
  const [userCents, setUserCents] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => () => {
    timersRef.current.forEach(id => clearTimeout(id));
    stopAll();
  }, []);

  const pitch = usePitchDetection({
    a4,
    onFrame: (frame) => {
      if (frame.frequency > 0 && frame.confidence > 0.5) {
        setUserMidi(Math.round(frame.midi));
        setUserCents(frame.cents);
      }
    },
  });

  // For sing-third: play the root, user sings the major third above (4 semitones)
  // For sing-fifth: play the root, user sings the perfect fifth above (7 semitones)
  const semitones = isThird ? 4 : 7;
  const expectedMidi = targetMidi + semitones;

  const newTarget = () => {
    setTargetMidi(60 + Math.floor(Math.random() * 12));
    setUserMidi(null);
    setUserCents(0);
    setScore(null);
    setTries(0);
  };

  useEffect(() => {
    newTarget();
  }, []);

  const playReference = async () => {
    await ensureAudioStarted();
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
    const token = beginPlayback();
    stopAll();
    playNote(targetMidi, 1500, 0, a4);
    const id = window.setTimeout(() => { if (isPlaybackActive(token)) playNote(expectedMidi, 800, 0, a4); }, 1600);
    timersRef.current.push(id);
  };

  const checkAnswer = () => {
    if (userMidi === null) return;
    const correct = userMidi === expectedMidi;
    const accuracy = correct ? Math.max(0, 100 - Math.abs(userCents) * 2) : 0;
    setScore(accuracy);
    setTries(t => t + 1);
    if (correct && accuracy > 70) {
      addXp(30);
      if (!profile.badges.includes('first-lesson')) unlockBadge('first-lesson');
      const id = window.setTimeout(() => newTarget(), 1500);
      timersRef.current.push(id);
    }
  };

  const cents = userCents;
  const color = !userMidi ? 'text-slate-500' : userMidi === expectedMidi && Math.abs(cents) < 15 ? 'text-green-400' : userMidi === expectedMidi ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black display">{isThird ? t(lang, 'harmony.singThird') : t(lang, 'harmony.singFifth')}</h2>

      <div className="card p-5 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? `Vamos tocar uma nota base. Sua tarefa é cantar a ${isThird ? 'terça maior' : 'quinta justa'} acima dela. Use o afinador para verificar se acertou.`
            : `We will play a root note. Your job is to sing the ${isThird ? 'major third' : 'perfect fifth'} above it. Use the tuner to check if you got it.`}</p>
      </div>

      <div className="card p-6 text-center space-y-2">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{lang === 'pt-BR' ? 'Nota base' : 'Root note'}</div>
        <div className="text-6xl font-black font-mono neon-text">{midiToNoteName(targetMidi)}</div>
        <div className="text-xs text-slate-500 font-mono">{lang === 'pt-BR' ? 'Você deve cantar' : 'You should sing'}: <span className="text-violet-400">{midiToNoteName(expectedMidi)}</span></div>
      </div>

      <button onClick={playReference} className="btn-ghost w-full">
        <i className="fas fa-volume-up mr-2"></i>{lang === 'pt-BR' ? 'Tocar referência' : 'Play reference'}
      </button>

      {pitch.isListening && (
        <div className="card p-6 text-center space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{lang === 'pt-BR' ? 'Sua nota' : 'Your note'}</div>
          <div className={`text-5xl font-black font-mono ${color} ${userMidi ? 'pulse-soft' : ''}`}>
            {userMidi ? midiToNoteName(userMidi) : '—'}
          </div>
          <div className="relative h-3 rounded-full gauge-bg overflow-hidden max-w-xs mx-auto">
            <div className="absolute top-0 bottom-0 w-1 bg-white transition-all duration-75" style={{ left: `${Math.max(0, Math.min(100, ((cents + 50) / 100) * 100))}%`, transform: 'translateX(-50%)' }} />
          </div>
          {score !== null && (
            <div className={`text-2xl font-black ${score > 70 ? 'text-green-400' : 'text-red-400'}`}>
              {score > 70 ? `+30 XP!` : (lang === 'pt-BR' ? 'Tente de novo' : 'Try again')}
            </div>
          )}
          <button onClick={checkAnswer} disabled={userMidi === null} className="btn-primary disabled:opacity-40">
            {lang === 'pt-BR' ? 'Verificar' : 'Check answer'}
          </button>
        </div>
      )}

      <button onClick={() => pitch.isListening ? pitch.stop() : pitch.start()} className={`btn-primary w-full ${pitch.isListening ? '!bg-gradient-to-r !from-red-500 !to-orange-500' : ''}`}>
        <i className={`fas ${pitch.isListening ? 'fa-stop' : 'fa-microphone'} mr-2`}></i>
        {pitch.isListening ? t(lang, 'tuner.stop') : t(lang, 'tuner.start')}
      </button>

      <button onClick={newTarget} className="btn-ghost w-full">
        <i className="fas fa-random mr-2"></i>{lang === 'pt-BR' ? 'Nova nota base' : 'New root note'}
      </button>

      {pitch.error && <div className="text-center text-red-400 text-sm">{pitch.error}</div>}
    </div>
  );
}
