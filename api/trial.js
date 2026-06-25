const { supabaseAdmin, getUserFromRequest, json } = require('./_lib/supabaseAdmin');

// Simple in-memory rate limit: max 5 trial attempts per IP per 10 minutes
const rateLimit = {};
function isRateLimited(ip) {
  const now = Date.now();
  const window = 10 * 60 * 1000;
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter(t => now - t < window);
  if (rateLimit[ip].length >= 5) return true;
  rateLimit[ip].push(now);
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Não autenticado. Faça login para ativar o teste.' });

  const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  if (isRateLimited(clientIp)) return json(res, 429, { error: 'Muitas tentativas. Aguarde 10 minutos.' });

  const admin = supabaseAdmin();
  if (!admin) return json(res, 500, { error: 'Backend não configurado.' });

  const { teacherCode } = req.body || {};
  const code = typeof teacherCode === 'string' ? teacherCode.trim() : '';
  const now = Date.now();

  const { data: sub } = await admin.from('subscriptions')
    .select('*').eq('user_id', user.id).maybeSingle();

  if (sub && sub.status === 'active' && sub.plan !== 'free' && sub.plan !== 'trial') {
    return json(res, 409, { error: 'Você já possui uma assinatura ativa.' });
  }

  if (code) {
    if (sub && sub.status === 'trialing' && sub.trial_ends_at) {
      const left = new Date(sub.trial_ends_at).getTime() - now;
      if (left > 0) {
        return json(res, 409, { error: 'Você já está em período de teste.' });
      }
    }
    const { data: tc } = await admin.from('teacher_codes')
      .select('*').eq('code', code).maybeSingle();
    if (!tc) return json(res, 400, { error: 'Código de professor inválido.' });
    if (tc.max_uses != null && tc.uses >= tc.max_uses) {
      return json(res, 400, { error: 'Este código atingiu o limite de usos.' });
    }
    let usesUpdate = admin.from('teacher_codes').update({ uses: tc.uses + 1 }).eq('code', code);
    if (tc.max_uses != null) usesUpdate = usesUpdate.lt('uses', tc.max_uses);
    const { data: usesResult } = await usesUpdate.select();
    if (!usesResult || usesResult.length === 0) {
      return json(res, 409, { error: 'Este código atingiu o limite de usos.' });
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
    return json(res, 200, { ok: true, trialEndsAt, days, via: 'teacher_code' });
  }

  if (sub && sub.trial_used) {
    return json(res, 409, { error: 'Você já usou seu teste grátis de 7 dias.' });
  }
  const trialDays = 7;
  const trialEndsAt = new Date(now + trialDays * 86400000).toISOString();
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
  return json(res, 200, { ok: true, trialEndsAt, days: trialDays, via: 'free_trial' });
};
