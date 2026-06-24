import { useState } from 'react';
import { PLANS, formatBRL } from '../data/pricing';

// ──────────────────────────────────────────────────────────────────────────
// MasterSinger — landing de alta conversão.
// Anchoring central: 1 ano de MasterSinger = preço de ~1 mês de aula particular.
// Rota: "/" mostra a landing; "/#app" abre o app. (Hash routing manual, sem lib.)
// ──────────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '🎙️', title: 'Afinador em tempo real', desc: 'Detecção de pitch YIN com suavização anti-oitava. Veja exatamente quantos cents você está fora, com setas ALTO/BAIXO claras.' },
  { icon: '💪', title: 'Prática gamificada', desc: '30+ exercícios de escalas, arpejos, saltos de intervalo e sustentação de nota. Pontuação por afinação, tempo, estabilidade e cobertura.' },
  { icon: '🔥', title: 'Aquecimento guiado', desc: 'Rotinas prontas (rápido, completo, agudos, graves) com áudio-guia e feedback de pitch ao vivo. 5 minutos pra sua voz ficar pronta.' },
  { icon: '🎓', title: 'Academia completa', desc: '8 cursos guiados do iniciante ao avançado: aquecimento, afinação, intervalos, escalas, harmonia, aparelho vocal, saúde vocal e técnica de canto. Aulas em PT-BR com dicas de professor.' },
  { icon: '👂', title: 'Treino de ouvido', desc: 'Identifique intervalos melódicos e harmônicos, escalas e acordes de ouvido. A habilidade por trás de toda boa afinação.' },
  { icon: '🎼', title: 'Harmonia e terças', desc: 'Aprenda a cantar terças e quintas acima da melodia — o coração dos backing vocals. Treino com detecção de pitch ao vivo.' },
  { icon: '📼', title: 'Estúdio de melodias', desc: 'Cante, capture, edite num piano roll visual e exporte como MIDI. Sua melodia vira arquivo musical pronto pra produzir.' },
  { icon: '📊', title: 'Progresso e gamificação', desc: 'XP, níveis, sequência diária, ligas semanais, conquistas e registro vocal. O vício saudável de evoluir todo dia.' },
];

const PROBLEMS = [
  { icon: '😕', text: 'Canta fora do tom e não sabe corrigir?' },
  { icon: '💸', text: 'Aula de canto particular custa R$400+/mês?' },
  { icon: '🎤', text: 'Não tem feedback em tempo real quando treina?' },
  { icon: '⏰', text: 'Falta tempo e motivação pra treinar sozinho?' },
];

const STEPS = [
  { n: 1, icon: '🎤', title: 'Permita o microfone', desc: 'Tudo roda no seu navegador. Nada é gravado ou enviado — 100% local e privado.' },
  { n: 2, icon: '🎯', title: 'Cante e veja na hora', desc: 'O afinador mostra sua nota, frequência e quantos cents você está fora, com setas pra corrigir.' },
  { n: 3, icon: '📈', title: 'Treine e evolua', desc: 'Exercícios gamificados, aquecimentos guiados e cursos. Suba de nível, mantenha sequência, veja sua voz melhorar.' },
];

const COMPARISON = [
  { feature: 'Detecção de pitch em tempo real', ms: true, lesson: true, others: 'parcial' },
  { feature: 'Aulas estruturadas (8 cursos)', ms: true, lesson: true, others: false },
  { feature: 'Aquecimento guiado interativo', ms: true, lesson: false, others: false },
  { feature: 'Treino de ouvido + harmonia', ms: true, lesson: 'às vezes', others: false },
  { feature: 'Estúdio de melodias (MIDI)', ms: true, lesson: false, others: false },
  { feature: 'Treine quando e onde quiser', ms: true, lesson: false, others: true },
  { feature: 'Gamificação e progresso', ms: true, lesson: false, others: 'parcial' },
  { feature: 'Custo mensal', ms: 'R$16', lesson: 'R$400+', others: 'R$40+' },
];

const PERSONAS = [
  { icon: '🌱', title: 'Iniciante total', desc: 'Nunca cantou? Acha que é "tone deaf"? O MasterSinger te prova o contrário com feedback visual imediato.' },
  { icon: '🎶', title: 'Cantor amador', desc: 'Canta no chuveiro, no culto, no karaokê. Quer afinar de verdade e ter confiança pra se apresentar.' },
  { icon: '🎸', title: 'Músico e compositor', desc: 'Toca instrumento mas a voz trava. Use o estúdio pra capturar melodias e exportar em MIDI direto na sua DAW.' },
  { icon: '🎤', title: 'Cantor avançado', desc: 'Já canta bem? Treine harmonia, intervalos complexos e mantenha a voz afiada entre as aulas com seu professor.' },
];

const FAQ = [
  { q: 'Preciso saber música pra usar?', a: 'Não. O MasterSinger foi feito do zero. Comece pela Academia → curso de Aquecimento, depois Afinação. Tudo em português, passo a passo.' },
  { q: 'Funciona no celular?', a: 'Sim. É um web app responsivo — funciona no navegador do celular, tablet e computador. Melhor experiência no Chrome/Safari atualizados.' },
  { q: 'Minha voz é gravada ou enviada pra algum lugar?', a: 'Nunca. A detecção de pitch roda 100% local no seu navegador via Web Audio API. Nenhum áudio sai do seu dispositivo.' },
  { q: 'Qual a precisão do afinador?', a: 'Usamos o algoritmo YIN (de Cheveigné & Kawahara, 2002) com suavização anti-oitava e filtro de mediana. Precisão de cents, dentro de ±2 cents quando travado.' },
  { q: 'Posso cancelar a assinatura?', a: 'Sim, quando quiser, sem multa. O plano anual tem garantia de 7 dias com reembolso total. O vitalício tem 14 dias.' },
  { q: 'MasterSinger substitui aula com professor?', a: 'Complementa. É o treino diário entre as aulas — e pra muitos, a porta de entrada acessível antes de investir em aulas. Muitos professores já recomendam apps assim.' },
  { q: 'Como funciona o pagamento?', a: 'Via Asaas ou AbacatePay (Pix, cartão, boleto). Em breve você poderá assinar direto no app com alguns cliques.' },
];

const SOCIAL_STATS = [
  { value: '±2', label: 'cents de precisão' },
  { value: '30+', label: 'exercícios' },
  { value: '8', label: 'cursos completos' },
  { value: '100%', label: 'local e privado' },
];

export function Landing({ onEnterApp }: { onEnterApp: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen text-slate-100">
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/70 border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎤</span>
            <span className="text-sm font-black display neon-text">MasterSinger</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="#planos" className="hidden sm:block px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-violet-300 transition-all">Planos</a>
            <a href="#como-funciona" className="hidden sm:block px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-violet-300 transition-all">Como funciona</a>
            <a href="#faq" className="hidden sm:block px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-violet-300 transition-all">FAQ</a>
            <button onClick={onEnterApp} className="btn-primary text-[11px] px-4 py-2">Entrar no app</button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 pt-16 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] font-mono text-violet-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 pulse-soft"></span>
            Detecção de pitch em tempo real · 100% no navegador
          </div>

          <h1 className="text-4xl sm:text-6xl font-black display tracking-tight leading-[1.05] mb-5">
            Cante <span className="neon-text">afinado</span>.<br />
            Domine sua voz no seu tempo.
          </h1>

          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            O treinador vocal completo que cabe no seu bolso. Afinador preciso em tempo real,
            exercícios gamificados, aquecimentos guiados e cursos — por <span className="text-violet-300 font-bold">menos de R$17/mês</span>.
            A evolução que uma aula de R$400/mês te dá, sem o preço.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <button onClick={onEnterApp} className="btn-primary text-sm px-8 py-3.5">
              🎤 Começar grátis agora
            </button>
            <a href="#planos" className="btn-ghost text-xs px-6 py-3">Ver planos e preços</a>
          </div>

          <p className="text-xs text-slate-500 font-mono">
            Sem cartão de crédito · Funciona no celular e PC · 100% local e privado
          </p>

          {/* Mockup visual */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="card p-6 text-left space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Alvo</span>
                <span className="text-2xl font-black font-mono text-violet-300">A4</span>
                <span className="text-slate-600">→</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Você</span>
                <span className="text-2xl font-black font-mono text-green-400 pulse-soft">A4 ✓</span>
              </div>
              <div className="relative h-5 rounded-full gauge-bg overflow-hidden">
                <div className="absolute top-0 bottom-0 w-1.5 bg-white shadow-lg" style={{ left: '50%', transform: 'translateX(-50%)' }} />
              </div>
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-green-500/15 border border-green-500/30 w-fit mx-auto">
                <span className="text-xl">✓</span>
                <span className="text-sm font-bold text-green-300 uppercase tracking-wider font-mono">Afinado!</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problems / pains ── */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">Você se identifica?</div>
          <h2 className="text-3xl font-black display tracking-tight">A cantoria de quem quer cantar melhor</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {PROBLEMS.map((p, i) => (
            <div key={i} className="card p-5 flex items-center gap-4">
              <span className="text-2xl">{p.icon}</span>
              <p className="text-sm text-slate-200 font-medium">{p.text}</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-8 text-slate-400 max-w-xl mx-auto text-sm">
          Se você se viu em algum desses, o MasterSinger foi feito pra você.
        </p>
      </section>

      {/* ── Solution / what it is ── */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="card p-8 sm:p-10 space-y-5">
          <div className="text-xs text-violet-300 uppercase tracking-wider font-mono">A solução</div>
          <h2 className="text-3xl sm:text-4xl font-black display tracking-tight">
            Um treinador vocal completo na palma da mão
          </h2>
          <p className="text-slate-300 leading-relaxed">
            O MasterSinger junta num só app o que você só encontra espalhado em 4 ou 5 ferramentas diferentes —
            ou que custa caro numa aula particular. Detecção de pitch em tempo real com algoritmo YIN,
            exercícios gamificados que pontuam sua afinação, aquecimentos guiados com áudio e feedback ao vivo,
            uma academia com 8 cursos do zero ao avançado, treino de ouvido, harmonia e um estúdio pra capturar
            suas melodias em MIDI.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Tudo isso roda <span className="text-violet-300 font-semibold">100% no seu navegador</span>.
            Nenhum áudio é enviado pra nenhum servidor — sua voz é sua. Funciona no celular e no computador.
            E custa menos que uma pizza por mês.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">Como funciona</div>
          <h2 className="text-3xl font-black display tracking-tight">3 passos. Menos de 1 minuto pra começar.</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {STEPS.map(s => (
            <div key={s.n} className="card p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 font-black font-mono flex items-center justify-center text-sm">{s.n}</span>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <h3 className="text-base font-bold">{s.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">Tudo num só app</div>
          <h2 className="text-3xl font-black display tracking-tight">8 ferramentas que você não precisa mais buscar separadas</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {FEATURES.map((f, i) => (
            <div key={i} className="card p-5 space-y-2 hover:border-violet-500/30 transition-all">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{f.icon}</span>
                <h3 className="text-base font-bold">{f.title}</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social stats ── */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="card p-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {SOCIAL_STATS.map((s, i) => (
            <div key={i}>
              <div className="text-3xl sm:text-4xl font-black neon-text font-mono">{s.value}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who it's for ── */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">Para quem é</div>
          <h2 className="text-3xl font-black display tracking-tight">Seja qual for seu nível, tem lugar aqui</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PERSONAS.map((p, i) => (
            <div key={i} className="card p-5 space-y-2">
              <span className="text-3xl">{p.icon}</span>
              <h3 className="text-sm font-bold">{p.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">A matemática fala por si</div>
          <h2 className="text-3xl font-black display tracking-tight">MasterSinger vs. aula particular vs. outros apps</h2>
        </div>
        <div className="card overflow-hidden">
          <div className="grid grid-cols-4 gap-2 p-4 text-xs font-mono uppercase tracking-wider text-slate-400 border-b border-white/5">
            <div>Recurso</div>
            <div className="text-center text-violet-300">MasterSinger</div>
            <div className="text-center">Aula particular</div>
            <div className="text-center">Outros apps</div>
          </div>
          {COMPARISON.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 p-4 text-xs items-center border-b border-white/5 last:border-0">
              <div className="text-slate-200">{row.feature}</div>
              <Cell value={row.ms} />
              <Cell value={row.lesson} />
              <Cell value={row.others} />
            </div>
          ))}
        </div>
        <p className="text-center mt-5 text-sm text-slate-400">
          Um ano de MasterSinger Pro = <span className="text-violet-300 font-bold">R$197</span>.
          Um mês de aula particular = <span className="text-red-300 font-bold">R$400+</span>.
        </p>
      </section>

      {/* ── Pricing ── */}
      <section id="planos" className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-10">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">Planos e preços</div>
          <h2 className="text-3xl font-black display tracking-tight">Escolha seu plano. Comece hoje.</h2>
          <p className="text-sm text-slate-400 mt-2">Sem fidelidade. Cancele quando quiser. Garantia de reembolso.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className={`card p-6 space-y-4 flex flex-col relative ${plan.popular ? 'border-violet-500/50 ring-1 ring-violet-500/30' : ''}`}
            >
              {plan.highlight && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                  {plan.highlight}
                </div>
              )}
              <div>
                <h3 className="text-lg font-black display">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed min-h-[2.5rem]">{plan.tagline}</p>
              </div>
              <div>
                {plan.price === 0 ? (
                  <div className="text-3xl font-black font-mono">R$0</div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-mono">{formatBRL(plan.price)}</span>
                    <span className="text-xs text-slate-400 font-mono">{plan.period}</span>
                  </div>
                )}
                {plan.pricePerMonth != null && plan.pricePerMonth > 0 && (
                  <div className="text-[11px] text-violet-300 font-mono mt-1">
                    ≈ {formatBRL(plan.pricePerMonth)}/mês {plan.discountPct ? `· ${plan.discountPct}% OFF` : ''}
                  </div>
                )}
              </div>
              <button
                onClick={onEnterApp}
                className={`w-full text-xs py-3 rounded-xl font-bold uppercase tracking-wider transition-all ${
                  plan.popular
                    ? 'btn-primary'
                    : plan.id === 'free'
                    ? 'bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10'
                    : 'bg-white/5 border border-violet-500/30 text-violet-200 hover:bg-violet-500/10'
                }`}
              >
                {plan.cta}
              </button>
              <ul className="space-y-2 text-xs text-slate-300 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-violet-400 flex-shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="card p-5 mt-6 text-center text-xs text-slate-400 space-y-1">
          <p>💳 Pagamento via Pix, cartão ou boleto (Asaas/AbacatePay) — em breve direto no app.</p>
          <p>↩️ Pro Anual: garantia de 7 dias com reembolso total. Vitalício: 14 dias.</p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="card p-10 sm:p-14 text-center space-y-5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgb(124 58 237 / 0.4), transparent 70%)' }}></div>
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-black display tracking-tight">
              Sua voz melhor começa<br />no próximo 5 minutos.
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm">
              Comece pelo plano grátis. Sem cartão, sem cadastro complicado, sem compromisso.
              Se gostar, assina. Se não, cancela. Simples assim.
            </p>
            <button onClick={onEnterApp} className="btn-primary text-sm px-8 py-4 mt-2">
              🎤 Entrar no MasterSinger agora
            </button>
            <p className="text-[11px] text-slate-500 font-mono">Leva menos de 1 minuto · 100% gratuito pra começar</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-14">
        <div className="text-center mb-8">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-mono mb-2">Perguntas frequentes</div>
          <h2 className="text-3xl font-black display tracking-tight">Tirando suas dúvidas</h2>
        </div>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-5 text-left flex items-center justify-between gap-4"
              >
                <span className="text-sm font-bold">{item.q}</span>
                <span className={`text-violet-400 transition-transform ${openFaq === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed">{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 mt-10">
        <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎤</span>
              <span className="text-sm font-black display neon-text">MasterSinger</span>
            </div>
            <div className="flex gap-4 text-xs text-slate-500 font-mono">
              <a href="#planos" className="hover:text-violet-300 transition-all">Planos</a>
              <a href="#como-funciona" className="hover:text-violet-300 transition-all">Como funciona</a>
              <a href="#faq" className="hover:text-violet-300 transition-all">FAQ</a>
              <button onClick={onEnterApp} className="hover:text-violet-300 transition-all">Abrir app</button>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 font-mono space-y-1">
            <p>© {new Date().getFullYear()} MasterSinger. Feito pra cantores brasileiros.</p>
            <p>Detecção de pitch via algoritmo YIN. Áudio processado localmente — nada é enviado a servidores.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Comparison cell renderer ──
function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <div className="text-center text-green-400 text-base">✓</div>;
  if (value === false) return <div className="text-center text-slate-600">—</div>;
  if (value === 'parcial') return <div className="text-center text-amber-400 text-xs font-mono">~</div>;
  if (value === 'às vezes') return <div className="text-center text-amber-400 text-xs font-mono">~</div>;
  return <div className="text-center text-slate-200 font-mono text-xs">{value}</div>;
}
