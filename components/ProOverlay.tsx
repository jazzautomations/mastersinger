import { useStore } from '../store/store';

interface ProOverlayProps {
  children: React.ReactNode;
  view: string;        // view id (studio, ear, harmony, theory)
  viewName: string;    // localized name
}

// Per-feature pitch: the gate is where desire to subscribe is born, so each
// locked feature gets its own hook + concrete payoff, not a generic lock.
const FEATURE_PITCH: Record<string, { icon: string; headline: string; payoff: string; bullets: string[] }> = {
  studio: {
    icon: '📼',
    headline: 'Estúdio de Melodias',
    payoff: 'Capture sua voz, edite num piano roll visual e exporte como MIDI. Sua melodia vira arquivo musical pronto pra produzir na sua DAW.',
    bullets: [
      'Cante e veja cada nota desenhada na tela',
      'Arraste, corrija e refine sua melodia nota por nota',
      'Exporte em MIDI direto pro Ableton, FL Studio, Logic…',
    ],
  },
  ear: {
    icon: '👂',
    headline: 'Treino de Ouvido',
    payoff: 'Identifique intervalos, escalas e acordes de ouvido. A habilidade por trás de toda boa afinação — treine até virar automático.',
    bullets: [
      'Intervalos melódicos e harmônicos do uníssono à 9ª',
      'Reconheça escalas (maior, menor, modos) no primeiro toque',
      'Identifique acordes (maior, menor, 7, diminuto)',
    ],
  },
  harmony: {
    icon: '🎼',
    headline: 'Harmonia e Terças',
    payoff: 'Cante terças e quintas acima da melodia. O coração dos backing vocals — seja o cantor de apoio que todo produtor quer contratar.',
    bullets: [
      'Terças e quintas com detecção de pitch ao vivo',
      'Treine harmonia em cima de melodias reais',
      'Construa a orelha pra harmonizar qualquer música',
    ],
  },
  rhythm: {
    icon: '🥁',
    headline: 'Treino de Ritmo',
    payoff: 'Metrônomo + bater no tempo com pontuação por batida. Ritmo é metade do canto — e é o que separa quem "canta certo" de quem soa profissional.',
    bullets: [
      'Padrões do básico à síncope e tresillo',
      'Pontuação por timing: veja se adiantou ou atrasou, em ms',
      'Suba o BPM conforme melhora — precisão antes de velocidade',
    ],
  },
  theory: {
    icon: '📚',
    headline: 'Teoria Musical',
    payoff: 'Escalas, intervalos, acordes e modos do zero ao avançado. Entenda a matemática da música pra cantar com consciência, não no achismo.',
    bullets: [
      '12 escalas: maior, menor, modos gregos, pentatônica, blues',
      'Intervalos, acordes e campo harmônico explicados',
      'Visual interativo: clique e ouça cada relação',
    ],
  },
};

export function ProOverlay({ children, view, viewName }: ProOverlayProps) {
  const { isPro, openUpgrade } = useStore();

  if (isPro) return <>{children}</>;

  const pitch = FEATURE_PITCH[view] ?? {
    icon: '🔒',
    headline: viewName,
    payoff: 'Este recurso faz parte do MasterSinger Pro.',
    bullets: [],
  };

  return (
    <div className="relative">
      {/* Content visible but locked — a blurred teaser so the user SEES what
          they're missing, not a blank wall. */}
      <div className="pointer-events-none select-none opacity-30 blur-[2px] max-h-[320px] overflow-hidden">
        {children}
      </div>
      <div className="absolute inset-x-0 top-[280px] h-16 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />

      {/* Seductive gate — specific payoff, not a generic lock */}
      <div className="relative z-10 -mt-4 mx-auto max-w-md px-4 pb-8">
        <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{pitch.icon}</span>
            <div>
              <div className="text-[10px] text-amber-400 font-mono uppercase tracking-wider">Recurso Pro</div>
              <div className="text-lg font-black display">{pitch.headline}</div>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">{pitch.payoff}</p>

          {pitch.bullets.length > 0 && (
            <ul className="space-y-2">
              {pitch.bullets.map((b, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-300">
                  <span className="text-amber-400 flex-shrink-0">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => openUpgrade()}
            className="w-full btn-primary text-sm py-3.5 font-bold"
          >
            ⚡ Desbloquear agora · 7 dias grátis
          </button>
          <p className="text-center text-[10px] text-slate-500 font-mono">
            Sem cartão pra testar · Cancele quando quiser · R$28,90/mês no anual
          </p>
        </div>
      </div>
    </div>
  );
}
