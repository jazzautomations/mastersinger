import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { playNote, ensureAudioStarted, stopAll } from '../services/audioService';

// ──────────────────────────────────────────────────────────────────────────
// Rhythm trainer — metronome + tap-on-the-beat scoring. Rhythm is timing, not
// pitch, so this uses TAP input (far more reliable than the mic for onsets):
// the app plays a 1-bar pattern, then you reproduce it by tapping, and every
// onset is scored by how close it landed to the grid.
// ──────────────────────────────────────────────────────────────────────────

type Phase = 'select' | 'listen' | 'countin' | 'tap' | 'result';

interface Pattern {
  id: string;
  name: string;
  namePt: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  // onset positions within a 4/4 bar, in beats (0..4)
  onsets: number[];
  glyph: string; // tiny visual hint
}

const PATTERNS: Pattern[] = [
  { id: 'quarters',  name: 'Quarter notes',  namePt: 'Semínimas',          level: 'beginner',     onsets: [0, 1, 2, 3],                     glyph: '♩ ♩ ♩ ♩' },
  { id: 'half-q',    name: 'Half + quarters', namePt: 'Mínima + semínimas', level: 'beginner',     onsets: [0, 2, 3],                        glyph: '𝅗𝅥 ♩ ♩' },
  { id: 'eighths',   name: 'Eighth notes',    namePt: 'Colcheias',          level: 'intermediate', onsets: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], glyph: '♪♪ ♪♪ ♪♪ ♪♪' },
  { id: 'gallop',    name: 'Gallop',          namePt: 'Galope',             level: 'intermediate', onsets: [0, 1, 1.5, 2, 3, 3.5],           glyph: '♩ ♪♪ ♩ ♪♪' },
  { id: 'syncopa',   name: 'Syncopation',     namePt: 'Síncope',            level: 'advanced',     onsets: [0, 1.5, 2, 2.5, 3.5],            glyph: '♩ ♪ ♩ ♪ ♪' },
  { id: 'tresillo',  name: 'Tresillo (3-3-2)', namePt: 'Tresillo (3-3-2)',  level: 'advanced',     onsets: [0, 1.5, 3],                      glyph: '♩. ♩. ♩' },
];

const BEATS_PER_BAR = 4;

export function Rhythm() {
  const { profile, addXp, touchStreak, unlockBadge } = useStore();
  const lang = profile.settings.language;
  const L = (pt: string, en: string) => (lang === 'pt-BR' ? pt : en);

  const [phase, setPhase] = useState<Phase>('select');
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [bpm, setBpm] = useState(80);
  const [countBeat, setCountBeat] = useState(0);
  const [tapFlash, setTapFlash] = useState<'perfect' | 'good' | 'off' | null>(null);
  const [lastError, setLastError] = useState<number | null>(null); // ms, signed
  const [result, setResult] = useState<{ score: number; hits: number; total: number; avgMs: number } | null>(null);

  const timers = useRef<number[]>([]);
  const tapStartRef = useRef(0);          // performance.now() at bar start (tap phase)
  const tapsRef = useRef<number[]>([]);   // tap times relative to bar start (ms)
  const phaseRef = useRef<Phase>(phase);
  const patternRef = useRef<Pattern | null>(pattern);
  const bpmRef = useRef(bpm);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { patternRef.current = pattern; }, [pattern]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const beatMs = () => 60000 / bpmRef.current;

  const clearTimers = () => { timers.current.forEach(id => clearTimeout(id)); timers.current = []; };
  const schedule = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };

  // Click sounds: accent (beat 1) high, normal click mid, onset click bright.
  const click = useCallback((kind: 'accent' | 'beat' | 'onset') => {
    const midi = kind === 'accent' ? 84 : kind === 'beat' ? 76 : 79;
    playNote(midi, 60, 0, profile.settings.a4);
  }, [profile.settings.a4]);

  // ── Play the pattern once (a 1-bar demo) with a 4-beat count-in ──
  const listen = useCallback(async (p: Pattern) => {
    await ensureAudioStarted();
    clearTimers();
    setPhase('listen');
    const b = beatMs();
    // count-in (4 metronome beats)
    for (let i = 0; i < BEATS_PER_BAR; i++) {
      schedule(() => { click(i === 0 ? 'accent' : 'beat'); setCountBeat(i + 1); }, i * b);
    }
    // pattern onsets in the following bar
    const barStart = BEATS_PER_BAR * b;
    p.onsets.forEach(on => schedule(() => click('onset'), barStart + on * b));
    // metronome under the pattern bar too
    for (let i = 0; i < BEATS_PER_BAR; i++) {
      schedule(() => setCountBeat(i + 1), barStart + i * b);
    }
    schedule(() => { setPhase('select'); setCountBeat(0); }, barStart + BEATS_PER_BAR * b + 200);
  }, [click]);

  // ── Count-in then record taps for one bar ──
  const startTap = useCallback(async (p: Pattern) => {
    await ensureAudioStarted();
    clearTimers();
    tapsRef.current = [];
    setLastError(null);
    setTapFlash(null);
    setPhase('countin');
    const b = beatMs();
    for (let i = 0; i < BEATS_PER_BAR; i++) {
      schedule(() => { click(i === 0 ? 'accent' : 'beat'); setCountBeat(i + 1); }, i * b);
    }
    const barStart = BEATS_PER_BAR * b;
    // metronome keeps ticking during the tap bar (reference)
    for (let i = 0; i < BEATS_PER_BAR; i++) {
      schedule(() => { click('beat'); setCountBeat(i + 1); }, barStart + i * b);
    }
    schedule(() => { tapStartRef.current = performance.now(); setPhase('tap'); setCountBeat(1); }, barStart);
    // close the tap window a bit after the bar ends, then score
    schedule(() => finishTap(p), barStart + BEATS_PER_BAR * b + b * 0.6);
  }, [click]);

  const registerTap = useCallback(() => {
    if (phaseRef.current !== 'tap') return;
    const tMs = performance.now() - tapStartRef.current;
    tapsRef.current.push(tMs);
    // live feedback vs nearest grid onset
    const p = patternRef.current;
    if (p) {
      const b = beatMs();
      const expected = p.onsets.map(o => o * b);
      let best = Infinity;
      for (const e of expected) { const d = tMs - e; if (Math.abs(d) < Math.abs(best)) best = d; }
      setLastError(Math.round(best));
      const a = Math.abs(best);
      setTapFlash(a < 55 ? 'perfect' : a < 130 ? 'good' : 'off');
      setTimeout(() => setTapFlash(null), 180);
    }
  }, []);

  const finishTap = useCallback((p: Pattern) => {
    clearTimers();
    const b = beatMs();
    const expected = p.onsets.map(o => o * b);
    const taps = [...tapsRef.current];
    // Greedy nearest-match each expected onset to a unique tap.
    const used = new Set<number>();
    let errSum = 0, hits = 0;
    for (const e of expected) {
      let bestIdx = -1, bestD = Infinity;
      taps.forEach((tp, idx) => {
        if (used.has(idx)) return;
        const d = Math.abs(tp - e);
        if (d < bestD) { bestD = d; bestIdx = idx; }
      });
      // a match only counts within half a beat
      if (bestIdx >= 0 && bestD <= b * 0.5) {
        used.add(bestIdx);
        errSum += bestD;
        hits++;
      }
    }
    const total = expected.length;
    const avgMs = hits > 0 ? errSum / hits : 0;
    // timing score: <55ms ~ perfect, decays to 0 at 200ms
    const timingScore = hits > 0 ? Math.max(0, 100 - Math.max(0, avgMs - 55) / 1.45) : 0;
    const completeness = hits / total;
    // extra taps (beyond the pattern) lightly penalize
    const extra = Math.max(0, taps.length - hits);
    const extraPenalty = Math.min(25, extra * 8);
    const score = Math.max(0, Math.round(timingScore * completeness - extraPenalty));
    setResult({ score, hits, total, avgMs: Math.round(avgMs) });
    setPhase('result');
    if (score > 0) {
      const xp = Math.round((p.level === 'beginner' ? 15 : p.level === 'intermediate' ? 25 : 35) * (score / 100));
      if (xp > 0) addXp(xp);
      touchStreak();
      if (!profile.badges.includes('first-rhythm')) unlockBadge('first-rhythm');
    }
  }, [addXp, touchStreak, unlockBadge, profile.badges]);

  // keyboard: spacebar taps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); registerTap(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [registerTap]);

  // cleanup
  useEffect(() => () => { clearTimers(); stopAll(); }, []);

  // ── Select ──
  if (phase === 'select') {
    return (
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-2xl font-black display tracking-tight">{L('Treino de Ritmo', 'Rhythm Trainer')}</h1>
          <p className="text-slate-400 text-sm">{L('Ouça o padrão, depois bata de volta no tempo. O app pontua cada batida.', 'Hear the pattern, then tap it back in time. Every onset is scored.')}</p>
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-300">{L('Andamento', 'Tempo')}</span>
            <span className="text-lg font-black font-mono neon-text">{bpm} BPM</span>
          </div>
          <input type="range" min={50} max={160} step={1} value={bpm} onChange={e => setBpm(+e.target.value)} className="w-full" />
          <div className="text-[11px] text-slate-500">{L('Comece devagar. Precisão antes de velocidade — sempre.', 'Start slow. Accuracy before speed — always.')}</div>
        </div>

        <div className="grid gap-3">
          {PATTERNS.map(p => (
            <div key={p.id} className="card p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">{lang === 'pt-BR' ? p.namePt : p.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-400 font-mono uppercase">{p.level === 'beginner' ? L('fácil','easy') : p.level === 'intermediate' ? L('médio','med') : L('difícil','hard')}</span>
                  </div>
                  <div className="text-lg text-violet-300 font-mono tracking-widest mt-1">{p.glyph}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => listen(p)} className="btn-ghost text-xs px-3 py-2"><i className="fas fa-volume-up mr-1.5"></i>{L('Ouvir','Listen')}</button>
                  <button onClick={() => { setPattern(p); startTap(p); }} className="btn-primary text-xs px-3 py-2"><i className="fas fa-hand-pointer mr-1.5"></i>{L('Bater','Tap')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Listen ──
  if (phase === 'listen') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{L('Ouça o padrão', 'Listen to the pattern')}</div>
        <BeatDots active={countBeat} />
        <div className="text-5xl">🥁</div>
      </div>
    );
  }

  // ── Count-in / Tap ──
  if (phase === 'countin' || phase === 'tap') {
    const isTap = phase === 'tap';
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 select-none">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">
          {isTap ? L('BATA o padrão!', 'TAP the pattern!') : L('Prepare-se...', 'Get ready...')}
        </div>
        <BeatDots active={countBeat} />
        <button
          onPointerDown={(e) => { e.preventDefault(); registerTap(); }}
          disabled={!isTap}
          className={`w-56 h-56 rounded-full border-4 transition-all active:scale-95 flex items-center justify-center text-2xl font-black ${
            tapFlash === 'perfect' ? 'bg-green-500/40 border-green-300 scale-105' :
            tapFlash === 'good' ? 'bg-amber-500/30 border-amber-300' :
            tapFlash === 'off' ? 'bg-red-500/30 border-red-300' :
            isTap ? 'bg-violet-500/20 border-violet-400' : 'bg-white/5 border-white/10 opacity-50'
          }`}
        >
          {tapFlash === 'perfect' ? L('PERFEITO','PERFECT') : tapFlash === 'good' ? L('BOM','GOOD') : tapFlash === 'off' ? (lastError && lastError > 0 ? L('ATRASOU','LATE') : L('ADIANTOU','EARLY')) : (isTap ? '👆' : '…')}
        </button>
        {isTap && lastError != null && (
          <div className="text-xs font-mono text-slate-400">{lastError > 0 ? '+' : ''}{lastError} ms</div>
        )}
        <div className="text-[11px] text-slate-500 font-mono">{L('Toque na bola ou aperte ESPAÇO', 'Tap the circle or press SPACE')}</div>
      </div>
    );
  }

  // ── Result ──
  if (phase === 'result' && result && pattern) {
    return (
      <div className="space-y-6 pb-24">
        <div className="card p-8 text-center space-y-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">{lang === 'pt-BR' ? pattern.namePt : pattern.name}</div>
          <div className="text-7xl font-black neon-text font-mono ring-pop">{result.score}%</div>
          <div className="text-2xl">{result.score >= 90 ? '🥁🔥' : result.score >= 70 ? '👏' : '💪'}</div>
          <div className="text-sm text-slate-400">{result.hits}/{result.total} {L('batidas no tempo', 'onsets in time')}</div>
          {result.hits > 0 && <div className="text-xs text-slate-500 font-mono">{L('Erro médio', 'Avg error')}: ±{result.avgMs} ms</div>}
        </div>
        <div className="card p-4 flex gap-3 items-start">
          <span className="text-xl mt-0.5">🎯</span>
          <p className="text-sm text-slate-300 leading-relaxed">
            {result.score >= 90 ? L('No talo. Tente um BPM mais alto ou um padrão mais difícil.', 'Locked in. Try a higher BPM or a harder pattern.') :
             result.avgMs > 120 ? L('Você tá batendo, mas fora do centro. Diminua o BPM e foque em colar na batida.', 'You are tapping, but off-center. Lower the BPM and lock onto the click.') :
             result.hits < result.total ? L('Faltou batida. Conte os tempos em voz alta enquanto bate.', 'Missed onsets. Count the beats out loud while you tap.') :
             L('Bom! Repita até ficar consistente, depois suba o BPM.', 'Good! Repeat until consistent, then raise the BPM.')}
          </p>
        </div>
        <div className="grid gap-3">
          <button onClick={() => startTap(pattern)} className="btn-primary"><i className="fas fa-redo mr-2"></i>{L('Tentar de novo', 'Try again')}</button>
          <button onClick={() => listen(pattern)} className="btn-ghost"><i className="fas fa-volume-up mr-2"></i>{L('Ouvir o padrão', 'Hear the pattern')}</button>
          <button onClick={() => { setPhase('select'); setResult(null); }} className="btn-ghost">{L('Escolher outro', 'Pick another')}</button>
        </div>
      </div>
    );
  }

  return null;
}

function BeatDots({ active }: { active: number }) {
  return (
    <div className="flex gap-3">
      {[1, 2, 3, 4].map(n => (
        <div key={n} className={`w-5 h-5 rounded-full transition-all ${active === n ? 'bg-violet-400 scale-125 shadow-lg shadow-violet-500/50' : 'bg-white/10'}`} />
      ))}
    </div>
  );
}
