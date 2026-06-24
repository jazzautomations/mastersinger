import { supabaseAdmin, getUserFromRequest, json } from './_lib/supabaseAdmin';

// POST /api/trial  { teacherCode?: string }
// - Without a code: activates the 7-day trial (only if not already used).
// - With a valid teacher code: validates it against teacher_codes, checks
//   max_uses, increments usage, and grants a 30-day trial.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Não autenticado. Faça login para ativar o teste.' });

  const admin = supabaseAdmin();
  if (!admin) return json(res, 500, { error: 'Backend não configurado.' });

  const { teacherCode } = req.body || {};
  const code = typeof teacherCode === 'string' ? teacherCode.trim() : '';
  const now = Date.now();

  // Read the current subscription row (created on signup).
  const { data: sub } = await admin.from('subscriptions')
    .select('*').eq('user_id', user.id).maybeSingle();

  if (code) {
    // ── Teacher code path: validate against teacher_codes ──
    const { data: tc } = await admin.from('teacher_codes')
      .select('*').eq('code', code).maybeSingle();
    if (!tc) return json(res, 400, { error: 'Código de professor inválido.' });
    if (tc.max_uses != null && tc.uses >= tc.max_uses) {
      return json(res, 400, { error: 'Este código atingiu o limite de usos.' });
    }
    const days = tc.trial_days || 30;
    const trialEndsAt = new Date(now + days * 86400000).toISOString();
    const { error } = await admin.from('subscriptions').upsert({
      user_id: user.id,
      plan: 'trial',
      status: 'trialing',
      current_period_end: null,
      trial_ends_at: trialEndsAt,
      trial_used: true,
      teacher_code: code,
      asaas_payment_id: null,
      asaas_customer_id: null,
    }, { onConflict: 'user_id' });
    if (error) return json(res, 500, { error: error.message });
    // Increment usage (atomic-ish; acceptable at this scale).
    await admin.from('teacher_codes').update({ uses: tc.uses + 1 }).eq('code', code);
    return json(res, 200, { ok: true, trialEndsAt, days, via: 'teacher_code' });
  }

  // ── 7-day trial path: prevent reuse ──
  if (sub?.trial_used) {
    return json(res, 409, { error: 'Você já usou seu teste grátis de 7 dias.' });
  }
  const days = 7;
  const trialEndsAt = new Date(now + days * 86400000).toISOString();
  const { error } = await admin.from('subscriptions').upsert({
    user_id: user.id,
    plan: 'trial',
    status: 'trialing',
    current_period_end: null,
    trial_ends_at: trialEndsAt,
    trial_used: true,
    teacher_code: null,
    asaas_payment_id: null,
    asaas_customer_id: null,
  }, { onConflict: 'user_id' });
  if (error) return json(res, 500, { error: error.message });
  return json(res, 200, { ok: true, trialEndsAt, days, via: 'free_trial' });
}
