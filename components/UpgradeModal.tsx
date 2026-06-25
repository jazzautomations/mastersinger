import { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import { getSupabaseClient } from '../services/supabase';
import { PLANS, formatBRL } from '../data/pricing';
import { entitlementLabel } from '../services/entitlements';

// ──────────────────────────────────────────────────────────────────────────
// UpgradeModal — auth + plan selection + trial + teacher code + checkout.
// The single conversion surface. Gated features open this; the landing CTAs
// open this.
// ──────────────────────────────────────────────────────────────────────────

type Step = 'plans' | 'auth' | 'cpf' | 'checkout';

export function UpgradeModal() {
  const { upgradeOpen, closeUpgrade, authUser, subscription, isPro, refreshSubscription, signIn, signUp, upgradeDefaultPlan } = useStore();
  const [step, setStep] = useState<Step>('plans');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // ── auth form ──
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // ── teacher code ──
  const [teacherCode, setTeacherCode] = useState('');
  // ── pending checkout (plan selected before auth) ──
  const [pendingCheckout, setPendingCheckout] = useState<'pro-monthly' | 'pro-yearly' | null>(null);
  // ── CPF/CNPJ for Asaas payment ──
  const [cpfCnpj, setCpfCnpj] = useState('');

  useEffect(() => {
    if (!upgradeOpen) { setError(null); setInfo(null); setBusy(false); setStep('plans'); setPendingCheckout(null); setCpfCnpj(''); }
  }, [upgradeOpen]);

  if (!upgradeOpen) return null;

  const label = entitlementLabel(subscription);

  const handleAuth = async () => {
    setError(null); setBusy(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const res = await fn(email.trim(), password);
    setBusy(false);
    if (!res.ok) { setError(res.error || 'Falha na autenticação'); return; }
    await refreshSubscription();
    // If there's a pending checkout, proceed with it after auth
    if (pendingCheckout) {
      setStep('cpf');
    } else {
      setStep('plans');
    }
  };

  const startTrial = async () => {
    // If not logged in, show auth first
    if (!authUser) {
      setPendingCheckout(null);
      setStep('auth');
      return;
    }
    setError(null); setInfo(null); setBusy(true);
    try {
      const sb = getSupabaseClient();
      if (!sb) { setError('Backend não configurado'); setBusy(false); return; }
      const { data: session } = await sb.auth.getSession();
      const token = session.session?.access_token;
      const resp = await fetch('/api/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ teacherCode: teacherCode.trim() || undefined }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Falha ao ativar trial');
      await refreshSubscription();
      setInfo(teacherCode.trim()
        ? 'Trial de 30 dias ativado pelo código do professor! 🎉'
        : 'Trial de 7 dias ativado! Aproveite todos os recursos. 🎉');
    } catch (e: any) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  const checkout = async (planId: 'pro-monthly' | 'pro-yearly') => {
    // If not logged in, save pending plan and show auth
    if (!authUser) {
      setPendingCheckout(planId);
      setStep('auth');
      return;
    }
    // If no CPF/CNPJ yet, show the CPF step
    if (!cpfCnpj.trim()) {
      setPendingCheckout(planId);
      setStep('cpf');
      return;
    }
    setError(null); setInfo(null); setBusy(true);
    try {
      const sb = getSupabaseClient();
      if (!sb) { setError('Backend não configurado'); setBusy(false); return; }
      const { data: session } = await sb.auth.getSession();
      const token = session.session?.access_token;
      const digits = cpfCnpj.replace(/\D/g, '');
      const resp = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ planId, cpfCnpj: digits }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Falha no checkout');

      // Validate invoiceUrl is a well-formed URL before redirecting.
      // Safari throws DOMException on window.location.href with malformed URLs.
      const rawUrl = data.checkoutUrl || data.invoiceUrl;
      if (!rawUrl || typeof rawUrl !== 'string') {
        throw new Error('URL de pagamento não recebida. Tente novamente.');
      }
      let invoiceUrl: URL;
      try {
        invoiceUrl = new URL(rawUrl);
      } catch {
        throw new Error('URL de pagamento inválida. Tente novamente.');
      }
      if (!invoiceUrl.protocol.startsWith('http')) {
        throw new Error('URL de pagamento inválida. Tente novamente.');
      }
      // Strict allowlist: only the real Asaas checkout domains.
      const ALLOWED = ['asaas.com', 'asaas.com.br'];
      const host = invoiceUrl.hostname.toLowerCase();
      const ok = ALLOWED.some(d => host === d || host.endsWith('.' + d));
      if (!ok) {
        throw new Error('URL de pagamento inválida. Tente novamente.');
      }

      setInfo('Redirecionando para o checkout seguro (Asaas)...');
      // Use window.open instead of window.location.href — Safari throws
      // DOMException on location.href assignment with certain URL formats.
      window.open(invoiceUrl.href, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  const proPlans = PLANS.filter(p => p.billingCycle);

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeUpgrade} />

      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-slate-900 sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl">
        {/* header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-white/5 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎤</span>
            <div>
              <div className="text-sm font-black display">MasterSinger Pro</div>
              {authUser && <div className="text-[10px] text-slate-400 font-mono">{authUser.email} · {label}</div>}
            </div>
          </div>
          <button onClick={closeUpgrade} className="w-8 h-8 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center" aria-label="Fechar">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-3">{error}</div>
          )}
          {info && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-300 text-xs rounded-xl p-3">{info}</div>
          )}

          {/* ── AUTH STEP ── */}
          {step === 'auth' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black display">{mode === 'signup' ? 'Crie sua conta' : 'Entrar'}</h2>
                <p className="text-xs text-slate-400">
                  {pendingCheckout
                    ? 'Faça login pra continuar com a assinatura. Seus dados ficam salvos na nuvem.'
                    : 'Necessário pra ativar o trial e assinar. Seus dados ficam salvos na nuvem.'}
                </p>
              </div>
              <div className="space-y-2">
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (mín. 6 caracteres)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
                  onKeyDown={e => { if (e.key === 'Enter') handleAuth(); }}
                />
              </div>
              <button onClick={handleAuth} disabled={busy || !email || password.length < 6} className="btn-primary w-full text-sm py-3 disabled:opacity-40">
                {busy ? 'Aguarde...' : mode === 'signup' ? 'Criar conta e continuar' : 'Entrar'}
              </button>
              <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null); }} className="w-full text-xs text-slate-400 hover:text-violet-300 transition-all">
                {mode === 'signup' ? 'Já tem conta? Entrar' : 'Não tem conta? Criar agora'}
              </button>
              <button onClick={() => { setStep('plans'); setPendingCheckout(null); setError(null); }} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-all">
                ← Voltar aos planos
              </button>
            </div>
          )}

          {/* ── CPF/CNPJ STEP ── */}
          {step === 'cpf' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black display">Dados de pagamento</h2>
                <p className="text-xs text-slate-400">
                  Informe seu CPF ou CNPJ pra gerar a cobrança. Obrigatório pelo Asaas.
                </p>
              </div>
              <div className="space-y-2">
                <input
                  type="text" value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)}
                  placeholder="CPF ou CNPJ (só números)"
                  maxLength={18}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:outline-none font-mono"
                  onKeyDown={e => { if (e.key === 'Enter' && cpfCnpj.replace(/\D/g, '').length >= 11) { setStep('checkout'); checkout(pendingCheckout!); } }}
                />
                <p className="text-[10px] text-slate-500 font-mono">11 dígitos = CPF · 14 dígitos = CNPJ</p>
              </div>
              <button
                onClick={() => { setStep('checkout'); checkout(pendingCheckout!); }}
                disabled={busy || cpfCnpj.replace(/\D/g, '').length < 11}
                className="btn-primary w-full text-sm py-3 disabled:opacity-40"
              >
                {busy ? 'Aguarde...' : 'Continuar pro pagamento'}
              </button>
              <button onClick={() => { setStep('plans'); setPendingCheckout(null); setError(null); }} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-all">
                ← Voltar aos planos
              </button>
            </div>
          )}

          {/* ── PLANS STEP ── */}
          {step === 'plans' && !isPro && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black display">Desbloqueie tudo</h2>
                <p className="text-xs text-slate-400">30+ exercícios, 8 cursos, estúdio MIDI, treino de ouvido, harmonia e mais.</p>
              </div>

              {/* Trial CTA */}
              <div className="card p-4 space-y-3 border-cyan-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎁</span>
                  <div className="text-sm font-bold">Teste grátis primeiro</div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ative <span className="text-cyan-300 font-semibold">7 dias grátis</span> sem cartão de crédito. <span className="text-green-400 font-semibold">Nenhuma cobrança agora.</span> Cancele a qualquer momento.
                </p>
                <input
                  type="text" value={teacherCode} onChange={e => setTeacherCode(e.target.value)}
                  placeholder="Código do professor (opcional)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button onClick={startTrial} disabled={busy} className="w-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 rounded-xl py-3 text-sm font-bold hover:bg-cyan-500/30 transition-all disabled:opacity-40">
                  {busy ? 'Aguarde...' : teacherCode.trim() ? 'Ativar 30 dias com o código' : 'Ativar 7 dias grátis'}
                </button>
                <p className="text-center text-[10px] text-slate-500 font-mono">
                  {teacherCode.trim()
                    ? 'Código do professor: 30 dias de acesso completo'
                    : 'Cobrança automática após 7 dias · Cancele quando quiser'}
                </p>
              </div>

              {/* Paid plans */}
              <div className="space-y-2">
                {proPlans.map(plan => (
                  <div key={plan.id} className={`card p-4 flex items-center gap-4 ${plan.popular ? 'border-violet-500/50 ring-1 ring-violet-500/20' : ''}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black display">{plan.name}</span>
                        {plan.highlight && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold uppercase">{plan.highlight}</span>}
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black font-mono">{formatBRL(plan.price)}</span>
                        <span className="text-xs text-slate-400 font-mono">{plan.period}</span>
                      </div>
                      {plan.pricePerMonth != null && (
                        <div className="text-[10px] text-violet-300 font-mono">≈ {formatBRL(plan.pricePerMonth)}/mês {plan.discountPct ? `· ${plan.discountPct}% OFF` : ''}</div>
                      )}
                      <div className="text-[10px] text-green-400 font-mono mt-1">✓ Cartão de crédito · Renovação automática · Cancele quando quiser</div>
                    </div>
                    <button
                      onClick={() => checkout(plan.id as 'pro-monthly' | 'pro-yearly')}
                      disabled={busy}
                      className={`text-xs px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all disabled:opacity-40 ${plan.popular ? 'btn-primary' : 'bg-white/5 border border-violet-500/30 text-violet-200 hover:bg-violet-500/10'}`}
                    >
                      Assinar
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono">
                <span>🔒</span>
                <span>Assinatura recorrente · Cartão de crédito · Cancele quando quiser</span>
              </div>

              <button onClick={closeUpgrade} className="w-full text-xs text-slate-500 hover:text-slate-300 transition-all py-2">
                Continuar com o plano gratuito
              </button>
            </div>
          )}

          {/* ── ALREADY PRO ── */}
          {step === 'plans' && isPro && (
            <div className="text-center space-y-4 py-6">
              <div className="text-5xl">👑</div>
              <div>
                <h2 className="text-lg font-black display">Você é Pro!</h2>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
                {subscription?.current_period_end && (
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Renova/expira em {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <button onClick={closeUpgrade} className="btn-primary text-sm px-8 py-3">Continuar treinando</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
