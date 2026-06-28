/**
 * games.ts — Catálogo e geradores dos mini-jogos do hub "Jogos".
 *
 * Mecânicas portadas (em ideia, não em código) do music-games / Theta Music
 * Trainer, reescritas para o stack do MasterSinger (theoryService + audioService
 * + usePitchDetection + store de gamificação).
 *
 * IMPORTANTE: as tolerâncias de afinação aqui são calibradas para VOZ humana
 * (±40 cents perfeito, ±80 bom). O original usava ±5/±15 cents — irreal para
 * canto, onde até cantores treinados oscilam ±20-30 cents num sustain.
 */

import { buildScale } from '../services/theoryService';

export type GameId = 'vocal-match' | 'scale-degrees' | 'sight-sing' | 'ear-blitz';

export interface GameDef {
  id: GameId;
  emoji: string;
  /** chave i18n do título */
  titleKey: string;
  /** chave i18n da descrição curta */
  descKey: string;
  usesMic: boolean;
  /** gradiente tailwind do card */
  accent: string;
}

export const GAMES: GameDef[] = [
  {
    id: 'vocal-match',
    emoji: '🎤',
    titleKey: 'games.vocalMatch.title',
    descKey: 'games.vocalMatch.desc',
    usesMic: true,
    accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
  },
  {
    id: 'scale-degrees',
    emoji: '🎼',
    titleKey: 'games.scaleDegrees.title',
    descKey: 'games.scaleDegrees.desc',
    usesMic: true,
    accent: 'from-violet-500/20 to-fuchsia-500/10 border-violet-500/30',
  },
  {
    id: 'sight-sing',
    emoji: '👀',
    titleKey: 'games.sightSing.title',
    descKey: 'games.sightSing.desc',
    usesMic: true,
    accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
  },
  {
    id: 'ear-blitz',
    emoji: '⚡',
    titleKey: 'games.earBlitz.title',
    descKey: 'games.earBlitz.desc',
    usesMic: false,
    accent: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30',
  },
];

// ── Afinação calibrada para voz ──────────────────────────────────
export const CENTS_PERFECT = 40;
export const CENTS_GOOD = 80;
/** ms que a nota precisa ser sustentada na faixa boa para contar como acerto */
export const HOLD_MS = 260;
/** ms de "cooldown" depois de um acerto antes de aceitar o próximo */
export const ADVANCE_DEBOUNCE_MS = 320;

/**
 * Distância em cents entre um MIDI detectado (float) e o alvo, com
 * EQUIVALÊNCIA DE OITAVA — cantar a nota certa em qualquer oitava conta.
 * Essencial: vozes graves/agudas e homens/mulheres cantam oitavas diferentes.
 */
export function centsOffOctaveEquiv(detectedMidi: number, targetMidi: number): number {
  let semis = (((detectedMidi - targetMidi) % 12) + 12) % 12;
  if (semis > 6) semis -= 12;
  return Math.abs(semis) * 100;
}

// ── Geração de frases (Vocal Match) ──────────────────────────────

export interface VocalLevel {
  level: number;
  numNotes: number;
  /** 'phrase' | 'triad-major' | 'triad-minor' | 'seventh' | 'sus4' | 'penta' | 'blues' */
  kind: string;
  descKey: string;
}

export const VOCAL_LEVELS: VocalLevel[] = [
  { level: 1, numNotes: 1, kind: 'phrase', descKey: 'games.vm.l1' },
  { level: 2, numNotes: 2, kind: 'phrase', descKey: 'games.vm.l2' },
  { level: 3, numNotes: 3, kind: 'phrase', descKey: 'games.vm.l3' },
  { level: 4, numNotes: 3, kind: 'triad-major', descKey: 'games.vm.l4' },
  { level: 5, numNotes: 4, kind: 'phrase', descKey: 'games.vm.l5' },
  { level: 6, numNotes: 3, kind: 'triad-minor', descKey: 'games.vm.l6' },
  { level: 7, numNotes: 5, kind: 'penta', descKey: 'games.vm.l7' },
  { level: 8, numNotes: 4, kind: 'seventh', descKey: 'games.vm.l8' },
  { level: 9, numNotes: 5, kind: 'phrase', descKey: 'games.vm.l9' },
  { level: 10, numNotes: 6, kind: 'blues', descKey: 'games.vm.l10' },
  { level: 11, numNotes: 6, kind: 'phrase', descKey: 'games.vm.l11' },
  { level: 12, numNotes: 8, kind: 'phrase', descKey: 'games.vm.l12' },
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Gera as notas (MIDI absoluto) de um nível do Vocal Match, centradas na
 * extensão confortável do usuário (rangeCenterMidi).
 */
export function generateVocalPhrase(level: number, centerMidi: number): number[] {
  const cfg = VOCAL_LEVELS[Math.min(level - 1, VOCAL_LEVELS.length - 1)];
  // raiz: tônica próxima do centro da voz, levemente abaixo para dar espaço de subida
  const root = Math.round(centerMidi) - 3;

  switch (cfg.kind) {
    case 'triad-major':
      return [root, root + 4, root + 7];
    case 'triad-minor':
      return [root, root + 3, root + 7];
    case 'seventh':
      return [root, root + 4, root + 7, root + 11];
    case 'sus4':
      return [root, root + 5, root + 7];
    case 'penta':
      return buildScale(root, 'majorPentatonic', 1).slice(0, 5);
    case 'blues':
      return buildScale(root, 'blues', 1).slice(0, 6);
    default: {
      // frase: caminhada por graus dentro da escala maior
      const scale = buildScale(root, 'major', 2);
      const notes: number[] = [scale[0]];
      const steps = [-2, -1, -1, 1, 1, 2, 2];
      for (let i = 1; i < cfg.numNotes; i++) {
        const lastIdx = scale.indexOf(notes[i - 1]);
        let nextIdx = lastIdx + rand(steps);
        if (nextIdx < 0) nextIdx = 1;
        if (nextIdx >= scale.length) nextIdx = scale.length - 2;
        notes.push(scale[nextIdx]);
      }
      return notes;
    }
  }
}

// ── Graus da escala / solfejo ────────────────────────────────────

export const SOLFEGE = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'];
export const SOLFEGE_EN = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'];

export interface DegreeRound {
  /** notas MIDI de toda a escala maior (8 notas, 1 oitava) */
  scale: number[];
  /** índice 0..6 do grau alvo */
  degreeIdx: number;
  /** MIDI alvo */
  targetMidi: number;
}

/**
 * Sorteia um grau da escala maior para o jogador cantar. `maxDegree` cresce
 * com o nível (começa em 1-3, depois toda a escala).
 */
export function makeDegreeRound(centerMidi: number, maxDegree: number): DegreeRound {
  const root = Math.round(centerMidi) - 2;
  const scale = buildScale(root, 'major', 1); // 8 notas
  const degreeIdx = Math.floor(Math.random() * Math.min(maxDegree, 7));
  return { scale, degreeIdx, targetMidi: scale[degreeIdx] };
}

// ── Leitura / sight-singing ──────────────────────────────────────

export interface SightPhrase {
  /** notas MIDI a cantar em ordem */
  notes: number[];
  /** tônica de referência (para o jogador se localizar) */
  tonic: number;
}

/**
 * Gera uma frase curta de leitura (graus conjuntos, dó-centric) para o
 * jogador ler na pauta e cantar. `numNotes` e saltos crescem com o nível.
 */
export function makeSightPhrase(centerMidi: number, level: number): SightPhrase {
  const root = Math.round(centerMidi) - 2;
  const scale = buildScale(root, 'major', 2);
  const numNotes = Math.min(3 + Math.floor(level / 2), 8);
  const maxStep = Math.min(2 + Math.floor(level / 3), 4); // saltos maiores em níveis altos
  const notes: number[] = [scale[0]];
  for (let i = 1; i < numNotes; i++) {
    const lastIdx = scale.indexOf(notes[i - 1]);
    const step = (Math.floor(Math.random() * (maxStep * 2 + 1)) - maxStep) || 1;
    let nextIdx = lastIdx + step;
    if (nextIdx < 0) nextIdx = 1;
    if (nextIdx >= scale.length) nextIdx = scale.length - 2;
    notes.push(scale[nextIdx]);
  }
  return { notes, tonic: scale[0] };
}
