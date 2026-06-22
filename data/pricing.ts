// ──────────────────────────────────────────────────────────────────────────
// MasterSinger — pricing & offer (single source of truth).
// Reused by the landing page AND the future checkout (Asaas/AbacatePay).
// Anchoring: 1 year of MasterSinger = the price of ~1 month of private lessons.
// ──────────────────────────────────────────────────────────────────────────

export type PlanId = 'free' | 'pro-monthly' | 'pro-yearly' | 'lifetime';
export type Currency = 'BRL';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: number;            // in BRL
  currency: Currency;
  period: string;           // "/mês", "/ano", "vitalício"
  pricePerMonth?: number;   // effective monthly (for display)
  discountPct?: number;     // vs monthly
  popular?: boolean;
  cta: string;
  features: string[];
  highlight?: string;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Comece a cantar melhor hoje — sem cartão.',
    price: 0,
    currency: 'BRL',
    period: 'para sempre',
    cta: 'Começar grátis',
    features: [
      'Afinador em tempo real (precisão YIN)',
      '3 exercícios de prática por dia',
      '1 aquecimento vocal guiado',
      '3 aulas da Academia',
      'Treino de ouvido básico',
      'Seu progresso salvo no dispositivo',
    ],
  },
  {
    id: 'pro-monthly',
    name: 'Pro',
    tagline: 'Treino completo, sem limites. Cancele quando quiser.',
    price: 29,
    currency: 'BRL',
    period: '/mês',
    cta: 'Assinar Pro',
    features: [
      'Tudo do Free, sem limites',
      '30+ exercícios ilimitados (escalas, arpejos, saltos, sustentação)',
      'Aquecimentos completos (rápido, completo, agudos, graves)',
      'Todos os 8 cursos da Academia',
      'Treino de ouvido avançado + harmonia',
      'Estúdio de melodias com export MIDI',
      'Relatórios de progresso e registro vocal',
      'Desafio diário com bônus de XP',
    ],
  },
  {
    id: 'pro-yearly',
    name: 'Pro Anual',
    tagline: 'O melhor valor. Equivale a 1 mês de aula particular.',
    price: 197,
    currency: 'BRL',
    period: '/ano',
    pricePerMonth: 16.4,
    discountPct: 45,
    popular: true,
    cta: 'Assinar Pro Anual',
    highlight: 'Mais popular',
    features: [
      'Tudo do Pro Mensal',
      'Economia de R$151/ano (45% OFF)',
      'Acesso a TODOS os recursos pra sempre dentro do plano',
      'Bônus de boas-vindas: +500 XP',
      'Novos exercícios e cursos incluídos',
      'Garantia de 7 dias — reembolso total',
      'Prioridade no suporte',
    ],
  },
  {
    id: 'lifetime',
    name: 'Vitalício',
    tagline: 'Pague uma vez. Seu pra sempre. Sem renovação.',
    price: 497,
    currency: 'BRL',
    period: 'uma vez',
    pricePerMonth: 0,
    discountPct: 0,
    cta: 'Comprar vitalício',
    highlight: 'Sem assinatura',
    features: [
      'Tudo do Pro Anual, para sempre',
      'Pague 1 vez, use pelo resto da vida',
      'Equivalente a 2 meses de aula particular',
      'Todas as futuras atualizações inclusas',
      'Selo de membro fundador no perfil',
      'Garantia de 14 dias — reembolso total',
    ],
  },
];

export function getPlan(id: PlanId): Plan | undefined {
  return PLANS.find(p => p.id === id);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}
