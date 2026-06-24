const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Comece a cantar melhor hoje — sem cartão, sem cadastro.',
    price: 0,
    currency: 'BRL',
    period: 'para sempre',
    cta: 'Começar grátis',
    features: [
      'Afinador em tempo real, ilimitado (precisão YIN)',
      '1 curso completo da Academia (Aquecimento)',
      '1 exercício de cada tipo na Prática (escala, arpejo, intervalo, sustentação)',
      'Seu progresso salvo no dispositivo',
    ],
  },
  {
    id: 'pro-monthly',
    name: 'Pro',
    tagline: 'Treino completo, sem limites. Cancele quando quiser.',
    price: 54.90,
    currency: 'BRL',
    period: '/mês',
    billingCycle: 'monthly',
    cta: 'Assinar Pro',
    features: [
      'Tudo do Free, sem limites',
      '30+ exercícios ilimitados (escalas, arpejos, saltos, sustentação)',
      'Todos os 8 cursos da Academia',
      'Aquecimentos completos (rápido, completo, agudos, graves)',
      'Treino de ouvido avançado + harmonia e terças',
      'Estúdio de melodias com export MIDI',
      'Relatórios de progresso e registro vocal',
      'Desafio diário com bônus de XP',
    ],
  },
  {
    id: 'pro-yearly',
    name: 'Pro Anual',
    tagline: 'O melhor valor. Equivale a ~1 mês de aula particular.',
    price: 347,
    currency: 'BRL',
    period: '/ano',
    pricePerMonth: 28.90,
    discountPct: 47,
    billingCycle: 'yearly',
    trialDays: 7,
    popular: true,
    cta: 'Assinar Pro Anual',
    highlight: 'Mais popular',
    features: [
      'Tudo do Pro Mensal',
      'Economia de R$311/ano (47% OFF)',
      '7 dias grátis pra testar — sem cartão',
      'Garantia de reembolso de 7 dias',
      'Bônus de boas-vindas: +500 XP',
      'Novos exercícios e cursos incluídos',
      'Prioridade no suporte',
    ],
  },
];

function getPlan(id) {
  return PLANS.find(function (p) { return p.id === id; });
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

module.exports = { PLANS, getPlan, formatBRL };
