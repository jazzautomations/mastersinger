import type { WarmupRoutine } from '../types';

// Helper: build a 5-note scale pattern (do-re-mi-fa-sol-fa-mi-re-do) on a root.
function fiveNoteScale(rootMidi: number, beatMs = 600) {
  const intervals = [0, 2, 4, 5, 7, 5, 4, 2, 0];
  return {
    midis: intervals.map(i => rootMidi + i),
    beatMs,
  };
}

export const WARMUP_ROUTINES: WarmupRoutine[] = [
  // ── Quick 5-minute warmup ──
  {
    id: 'quick',
    title: 'Aquecimento Rápido',
    description: '5 minutos para destravar a voz antes de cantar ou praticar.',
    totalMinutes: 5,
    steps: [
      {
        id: 'q1',
        kind: 'info',
        title: 'Relaxar o corpo',
        instructions: 'Pés no chão, coluna ereta, ombros pra baixo. Gire o pescoço devagar 3x pra cada lado e solte o maxilar (deixe a boca abrir com o peso da mandíbula). Voz boa começa num corpo solto.',
        durationMs: 40000,
        tip: 'Nada de força. Se sentir tensão no pescoço, respire fundo e solte os ombros de novo.',
      },
      {
        id: 'q2',
        kind: 'breath',
        title: 'Respiração diafragmática',
        instructions: 'Mão na barriga, outra no peito. Inspire pelo nariz em 4 tempos (a barriga sai pra frente, o peito quase não mexe). Solte o ar em "ssss" por 8 tempos, controlando o fluxo. Repita 3 vezes.',
        durationMs: 42000,
        tip: 'Se o peito subir junto, você está respirando de cima. Force a barriga pra fora.',
      },
      {
        id: 'q3',
        kind: 'glide',
        title: 'Vibração labial (lip trill)',
        instructions: 'Junte os lábios de leve e sopre até eles vibrarem (som de "motorzinho"). Adicione a voz num grave confortável e suba devagar até um agudo fácil, depois desça. Acompanhe a sirena de referência.',
        durationMs: 40000,
        tracksPitch: true,
        guide: { type: 'glide', fromMidi: 48, toMidi: 72 },
        targets: [{ midi: 60, startMs: 5000, durationMs: 30000 }],
        tip: 'Se os lábios não vibrarem, aperte os cantos da boca com os indicadores pra dar suporte.',
      },
      {
        id: 'q4',
        kind: 'scale',
        title: 'Humming — escala de 5 notas',
        instructions: 'Humming de boca fechada, som "mmm". Cante a escala de 5 notas (dó-ré-mi-fá-sol-fá-mi-ré-dó) acompanhando o áudio. Sinta a vibração nos lábios e no nariz. Suba meio tom e repita.',
        durationMs: 52000,
        tracksPitch: true,
        guide: { type: 'sequence', ...fiveNoteScale(60, 600) },
        targets: fiveNoteScale(60, 600).midis.map((m, i) => ({ midi: m, startMs: i * 600, durationMs: 600 })),
        tip: 'A vibração tem que estar pra frente, no "nariz". Se sentir na garganta, você está empurrando — alivie.',
      },
      {
        id: 'q5',
        kind: 'siren',
        title: 'Sirena (glissando)',
        instructions: 'Com a vogal "uuu" ou vibração labial, faça uma sirena subindo do grave mais confortável até o agudo mais fácil e voltando, sem quebrar. Deixe escorregar suave, sem pulos.',
        durationMs: 35000,
        tracksPitch: true,
        guide: { type: 'glide', fromMidi: 45, toMidi: 76 },
        targets: [{ midi: 60, startMs: 4000, durationMs: 27000 }],
        tip: 'O objetivo é conexão suave entre grave e agudo, não volume. Mantenha leve.',
      },
      {
        id: 'q6',
        kind: 'sustain',
        title: 'Sustentação com apoio',
        instructions: 'Cante e sustente a nota de referência na vogal "a" pelo tempo todo, com ar controlado pela barriga. Mantenha a afinação estável — o medidor mostra se você escorrega.',
        durationMs: 30000,
        tracksPitch: true,
        guide: { type: 'tone', midi: 60 },
        targets: [{ midi: 60, startMs: 0, durationMs: 30000 }],
        tip: 'Se começar a desafinar no fim, é falta de ar: doe mais apoio na barriga a partir da metade, não no começo.',
      },
      {
        id: 'q7',
        kind: 'info',
        title: 'Voz pronta!',
        instructions: 'Aquecimento completo. Sua voz está mais solta, com ar controlado e ressonância ativada. Agora vá pra Prática ou pro Afinador — você vai cantar bem melhor do que se começasse frio.',
        durationMs: 12000,
        tip: 'Aqueça sempre antes de cantar. 5 minutos hoje evita cansaço e lesão amanhã.',
      },
    ],
  },

  // ── Complete 10-minute warmup ──
  {
    id: 'complete',
    title: 'Aquecimento Completo',
    description: '10 minutos: relaxamento, fôlego, vibração, ressonância, escala e sustentação.',
    totalMinutes: 10,
    steps: [
      {
        id: 'c1',
        kind: 'info',
        title: 'Relaxar o corpo todo',
        instructions: 'Coluna ereta, pés no chão. Gire pescoço 3x cada lado. Solte o maxilar. Role os ombros pra trás 5x. Incline a cabeça pra cada ombro (sem levantar o ombro). Corpo tenso = voz tensa.',
        durationMs: 50000,
        tip: 'Faça devagar. Aquecimento de corpo é tão importante quanto o de voz.',
      },
      {
        id: 'c2',
        kind: 'breath',
        title: 'Fôlego: inspirar 4, soltar 8 e 16',
        instructions: 'Inspire pelo nariz em 4 tempos (barriga pra fora). Solte em "ssss" por 8 tempos. Repita soltando por 16. Faça 3 séries. Esse é o motor da sua voz.',
        durationMs: 60000,
        tip: 'O som do "ssss" deve ser constante, sem tremor. Tremor = ar escapando sem controle.',
      },
      {
        id: 'c3',
        kind: 'glide',
        title: 'Vibração labial subindo e descendo',
        instructions: 'Vibração labial ("motorzinho") com voz. Suba do grave ao agudo fácil e desça, acompanhando a sirena. Faça 2 passagens.',
        durationMs: 50000,
        tracksPitch: true,
        guide: { type: 'glide', fromMidi: 48, toMidi: 74 },
        targets: [{ midi: 61, startMs: 6000, durationMs: 38000 }],
        tip: 'A vibração labial protege as cordas vocais — é o exercício mais seguro pra explorar a extensão frio.',
      },
      {
        id: 'c4',
        kind: 'scale',
        title: 'Humming — escala em meio-tom',
        instructions: 'Humming (som "mmm") na escala de 5 notas, acompanhando o áudio. Suba meio tom e repita. Mantenha a vibração pra frente, no rosto.',
        durationMs: 70000,
        tracksPitch: true,
        guide: { type: 'sequence', ...fiveNoteScale(62, 620) },
        targets: fiveNoteScale(62, 620).midis.map((m, i) => ({ midi: m, startMs: i * 620, durationMs: 620 })),
        tip: 'Se a garganta começa a apertar no agudo, pare de subir. Aquecimento não é pra testar limite.',
      },
      {
        id: 'c5',
        kind: 'scale',
        title: 'Vogais — escada de 5 notas',
        instructions: 'Agora com boca aberta, na vogal "a". Cante a mesma escada de 5 notas. Sinta a diferença do humming pra a vogal aberta — o som precisa continuar ressonante e fácil.',
        durationMs: 70000,
        tracksPitch: true,
        guide: { type: 'sequence', ...fiveNoteScale(62, 620) },
        targets: fiveNoteScale(62, 620).midis.map((m, i) => ({ midi: m, startMs: i * 620, durationMs: 620 })),
        tip: 'No agudo, deixe o "a" abrir um pouquinho pra "ó". Isso desempurra a garganta.',
      },
      {
        id: 'c6',
        kind: 'siren',
        title: 'Sirena conectando registros',
        instructions: 'Vogal "uuu" ou vibração labial. Sirena lenta do grave ao agudo e volta, sem quebrar a voz. O objetivo é lisura entre o grave (peito) e o agudo (cabeça).',
        durationMs: 45000,
        tracksPitch: true,
        guide: { type: 'glide', fromMidi: 45, toMidi: 77 },
        targets: [{ midi: 61, startMs: 5000, durationMs: 35000 }],
        tip: 'Se a voz quebra num ponto, é o registro mudando. Pratique esse ponto devagar — com tempo ele suaviza.',
      },
      {
        id: 'c7',
        kind: 'sustain',
        title: 'Sustentação com apoio crescente',
        instructions: 'Sustente a nota na vogal "a" pelo tempo todo. Comece leve e vá dando mais apoio na barriga conforme o ar acaba. Mantenha afinado até o fim.',
        durationMs: 40000,
        tracksPitch: true,
        guide: { type: 'tone', midi: 64 },
        targets: [{ midi: 64, startMs: 0, durationMs: 40000 }],
        tip: 'O segredo da nota sustentada é o apoio aumentar no fim, não no começo.',
      },
      {
        id: 'c8',
        kind: 'info',
        title: 'Voz 100% pronta',
        instructions: 'Aquecimento completo feito. Corpo solto, ar controlado, ressonância ativada, registros conectados. Vá pra Prática que sua afinação e estabilidade vão estar bem melhores.',
        durationMs: 12000,
        tip: 'Faça o completo antes de apresentações ou sessões longas. O rápido basta pro dia a dia.',
      },
    ],
  },
];

export function getWarmupById(id: string): WarmupRoutine | undefined {
  return WARMUP_ROUTINES.find(r => r.id === id);
}
