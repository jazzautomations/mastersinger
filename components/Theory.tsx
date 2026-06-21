import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/store';
import { t } from '../i18n/strings';
import { playNote, playChord, playSequence, ensureAudioStarted, stopAll } from '../services/audioService';
import { SCALES, INTERVALS, NOTE_NAMES_SHARP, buildScale, midiToNoteName } from '../services/theoryService';

type Topic = 'notes' | 'intervals' | 'scales' | 'rhythm' | 'keys';

export function Theory() {
  const { profile } = useStore();
  const lang = profile.settings.language;
  const a4 = profile.settings.a4;
  const [topic, setTopic] = useState<Topic | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => () => {
    timersRef.current.forEach(id => clearTimeout(id));
    stopAll();
  }, []);

  const topics: { id: Topic; icon: string; titleKey: string }[] = [
    { id: 'notes',     icon: '🎵', titleKey: 'theory.notes' },
    { id: 'intervals', icon: '📏', titleKey: 'theory.intervals' },
    { id: 'scales',    icon: '🪜', titleKey: 'theory.scales' },
    { id: 'rhythm',    icon: '🥁', titleKey: 'theory.rhythm' },
    { id: 'keys',      icon: '🗝️', titleKey: 'theory.keys' },
  ];

  if (!topic) {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">{t(lang, 'theory.title')}</h1>
          <p className="text-slate-400 text-sm">{t(lang, 'theory.subtitle')}</p>
        </div>
        <div className="grid gap-3">
          {topics.map(({ id, icon, titleKey }) => (
            <button
              key={id}
              onClick={() => setTopic(id)}
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

  return (
    <div className="space-y-5 pb-24">
      <button onClick={() => setTopic(null)} className="btn-ghost">
        <i className="fas fa-arrow-left mr-2"></i>{t(lang, 'common.back')}
      </button>

      {topic === 'notes' && <NotesTopic lang={lang} a4={a4} />}
      {topic === 'intervals' && <IntervalsTopic lang={lang} a4={a4} />}
      {topic === 'scales' && <ScalesTopic lang={lang} a4={a4} />}
      {topic === 'rhythm' && <RhythmTopic lang={lang} />}
      {topic === 'keys' && <KeysTopic lang={lang} />}
    </div>
  );
}

interface TopicProps { lang: 'pt-BR' | 'en'; a4: number; }

function NotesTopic({ lang, a4 }: TopicProps) {
  const [selectedPc, setSelectedPc] = useState(0);
  const [octave, setOctave] = useState(4);
  const midi = (octave + 1) * 12 + selectedPc;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black display">{t(lang, 'theory.notes')}</h2>

      <div className="card p-5 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? 'Na música ocidental, dividimos a oitava em 12 semitons. Cada semitom recebe um nome de nota: 7 naturais (C-D-E-F-G-A-B) e 5 acidentadas (com sustenidos # ou bemóis b).'
            : 'In Western music, we divide the octave into 12 semitones. Each semitone gets a note name: 7 naturals (C-D-E-F-G-A-B) and 5 accidentals (with sharps # or flats b).'}</p>
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? 'A nota A4 (Lá na 4ª oitava) é a referência: 440 Hz por padrão. Cada oitava acima dobra a frequência; cada oitava abaixo divide por 2.'
            : 'The note A4 (A in the 4th octave) is the reference: 440 Hz by convention. Each octave above doubles the frequency; each below halves it.'}</p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
          {lang === 'pt-BR' ? 'Toque uma nota' : 'Play a note'}
        </div>
        <div className="grid grid-cols-6 gap-2">
          {NOTE_NAMES_SHARP.map((n, i) => (
            <button
              key={n}
              onClick={async () => { await ensureAudioStarted(); setSelectedPc(i); playNote((octave + 1) * 12 + i, 800, 0, a4); }}
              className={`p-3 rounded-lg text-sm font-bold font-mono transition-all ${selectedPc === i ? 'bg-violet-500 text-white' : 'bg-white/5 hover:bg-white/10'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">Octave</span>
          <input type="range" min={2} max={6} value={octave} onChange={e => setOctave(+e.target.value)} className="flex-1" />
          <span className="text-xs font-mono">{octave}</span>
        </div>
        <div className="text-center text-sm text-slate-300">
          <span className="text-violet-400 font-mono">{midiToNoteName(midi)}</span> · <span className="font-mono">{(a4 * Math.pow(2, (midi - 69) / 12)).toFixed(1)} Hz</span>
        </div>
      </div>
    </div>
  );
}

function IntervalsTopic({ lang, a4 }: TopicProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black display">{t(lang, 'theory.intervals')}</h2>

      <div className="card p-5 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? 'Um intervalo é a distância entre duas notas. Medimos em semitons: 1 semitom = 1 casa no violão = 1 tecla vizinha no piano. 2 semitons = 1 tom.'
            : 'An interval is the distance between two notes. We measure it in semitones: 1 semitone = 1 guitar fret = 1 adjacent piano key. 2 semitones = 1 whole tone.'}</p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
          {lang === 'pt-BR' ? 'Escute cada intervalo' : 'Listen to each interval'}
        </div>
        <div className="grid gap-2">
          {Object.values(INTERVALS).map(int => (
            <button
              key={int.name}
              onClick={async () => { await ensureAudioStarted(); playNote(60, 600, 0, a4); const id = window.setTimeout(() => playNote(60 + int.semitones, 800, 0, a4), 650); timersRef.current.push(id); }}
              className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
            >
              <span className="text-sm font-bold">{int.name}</span>
              <span className="text-xs text-slate-400 font-mono">{int.semitones} st</span>
              <i className="fas fa-volume-up text-violet-400 text-xs"></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScalesTopic({ lang, a4 }: TopicProps) {
  const [selectedScale, setSelectedScale] = useState('major');
  const [rootPc, setRootPc] = useState(0);

  const playScale = async () => {
    await ensureAudioStarted();
    const root = 60;
    const scale = SCALES[selectedScale];
    scale.intervals.forEach((interval, i) => {
      const id = window.setTimeout(() => playNote(root + interval, 350, 0, a4), i * 400);
      timersRef.current.push(id);
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black display">{t(lang, 'theory.scales')}</h2>

      <div className="card p-5 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? 'Uma escala é uma sequência ordenada de notas dentro de uma oitava. O padrão de tons e semitons define o "caráter" da escala — maior soa alegre, menor soa triste, dórico soa folclórico, etc.'
            : 'A scale is an ordered sequence of notes within an octave. The pattern of whole and half steps defines the scale\'s character — major sounds bright, minor sounds sad, dorian sounds folk-like, etc.'}</p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono w-12">Key</span>
          <select value={rootPc} onChange={e => setRootPc(+e.target.value)} className="bg-white/5 px-3 py-2 rounded-lg flex-1 text-sm">
            {NOTE_NAMES_SHARP.map((n, i) => <option key={n} value={i} className="bg-slate-900">{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono w-12">Scale</span>
          <select value={selectedScale} onChange={e => setSelectedScale(e.target.value)} className="bg-white/5 px-3 py-2 rounded-lg flex-1 text-sm">
            {Object.entries(SCALES).map(([k, v]) => <option key={k} value={k} className="bg-slate-900">{v.name}</option>)}
          </select>
        </div>
        <button onClick={playScale} className="btn-primary w-full">
          <i className="fas fa-play mr-2"></i>{lang === 'pt-BR' ? 'Tocar escala' : 'Play scale'}
        </button>
        <div className="flex flex-wrap gap-1.5">
          {SCALES[selectedScale].intervals.map((interval, i) => (
            <div key={i} className="px-2 py-1 bg-violet-500/20 rounded text-xs font-mono">
              {midiToNoteName(60 + interval)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RhythmTopic({ lang }: { lang: 'pt-BR' | 'en' }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black display">{t(lang, 'theory.rhythm')}</h2>
      <div className="card p-5 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? 'Ritmo é como o tempo é organizado na música. A unidade básica é a batida (beat). Em 4/4 (o compasso mais comum), há 4 batidas por compasso, e a semínima (quarter note) recebe 1 batida.'
            : 'Rhythm is how time is organized in music. The basic unit is the beat. In 4/4 (the most common time signature), there are 4 beats per measure, and the quarter note gets 1 beat.'}</p>
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? 'Subdivisões: semibreve = 4 batidas, mínima = 2, semínima = 1, colcheia = 0.5, semicolcheia = 0.25. As durações são relativas — o BPM define a velocidade real.'
            : 'Subdivisions: whole note = 4 beats, half = 2, quarter = 1, eighth = 0.5, sixteenth = 0.25. Durations are relative — BPM sets the actual speed.'}</p>
      </div>
      <div className="card p-5">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-3">
          {lang === 'pt-BR' ? 'Notação musical' : 'Music notation'}
        </div>
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
          <div className="p-2 bg-white/5 rounded">𝅝<div className="text-slate-500 mt-1">4</div></div>
          <div className="p-2 bg-white/5 rounded">𝅗𝅥<div className="text-slate-500 mt-1">2</div></div>
          <div className="p-2 bg-white/5 rounded">♩<div className="text-slate-500 mt-1">1</div></div>
          <div className="p-2 bg-white/5 rounded">♪<div className="text-slate-500 mt-1">½</div></div>
          <div className="p-2 bg-white/5 rounded">♬<div className="text-slate-500 mt-1">¼</div></div>
        </div>
      </div>
    </div>
  );
}

function KeysTopic({ lang }: { lang: 'pt-BR' | 'en' }) {
  const keyOrder = [
    { sig: '0#',  key: 'C',   rel: 'Am' },
    { sig: '1#',  key: 'G',   rel: 'Em' },
    { sig: '2#',  key: 'D',   rel: 'Bm' },
    { sig: '3#',  key: 'A',   rel: 'F#m' },
    { sig: '4#',  key: 'E',   rel: 'C#m' },
    { sig: '5#',  key: 'B',   rel: 'G#m' },
    { sig: '6#',  key: 'F#',  rel: 'D#m' },
    { sig: '7#',  key: 'C#',  rel: 'A#m' },
    { sig: '0b',  key: 'C',   rel: 'Am' },
    { sig: '1b',  key: 'F',   rel: 'Dm' },
    { sig: '2b',  key: 'Bb',  rel: 'Gm' },
    { sig: '3b',  key: 'Eb',  rel: 'Cm' },
    { sig: '4b',  key: 'Ab',  rel: 'Fm' },
    { sig: '5b',  key: 'Db',  rel: 'Bbm' },
    { sig: '6b',  key: 'Gb',  rel: 'Ebm' },
    { sig: '7b',  key: 'Cb',  rel: 'Abm' },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black display">{t(lang, 'theory.keys')}</h2>
      <div className="card p-5 space-y-3">
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === 'pt-BR'
            ? 'A armadura de clave (key signature) indica quais acidentes (sustenidos ou bemóis) são usados naquela tonalidade. Ela aparece no início da pauta e evita escrever os acidentes a cada nota.'
            : 'A key signature indicates which accidentals (sharps or flats) are used in that key. It appears at the start of the staff and avoids writing accidentals on every note.'}</p>
      </div>
      <div className="card p-5">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-3">
          {lang === 'pt-BR' ? 'Ciclo das tonalidades' : 'Circle of keys'}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {keyOrder.map(k => (
            <div key={`${k.sig}-${k.key}`} className="flex items-center justify-between p-2 bg-white/5 rounded font-mono">
              <span className="text-slate-400">{k.sig}</span>
              <span className="text-violet-400">{k.key}</span>
              <span className="text-slate-500">{k.rel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
