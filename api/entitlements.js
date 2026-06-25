const { supabaseAdmin, getUserFromRequest, json } = require('./_lib/supabaseAdmin');

// GET /api/entitlements
// Authoritative entitlement check. Validates the caller's Supabase JWT and
// returns the current paid-access state computed SERVER-SIDE — the client
// must use this (not a mutable localStorage snapshot) before trusting
// `isPro` for anything sensitive. RLS already protects the row; this adds
// a second layer so a corrupted/edited client cache cannot grant Pro.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Não autenticado' });

  const admin = supabaseAdmin();
  if (!admin) return json(res, 500, { error: 'Backend não configurado' });

  const { data } = await admin
    .from('subscriptions')
    .select('plan, status, current_period_end, trial_ends_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const sub = data || null;
  const now = Date.now();
  let isPro = false;
  let reason = 'free';

  if (sub) {
    if (sub.status === 'active') {
      if (sub.current_period_end) {
        isPro = new Date(sub.current_period_end).getTime() > now;
        reason = isPro ? 'active' : 'expired';
      } else {
        isPro = true;
        reason = 'active-no-end';
      }
    } else if (sub.status === 'trialing' || sub.plan === 'trial') {
      if (sub.trial_ends_at) {
        isPro = new Date(sub.trial_ends_at).getTime() > now;
        reason = isPro ? 'trial' : 'trial-expired';
      }
    }
  }

  return json(res, 200, {
    user_id: user.id,
    isPro,
    plan: sub?.plan ?? 'free',
    status: sub?.status ?? 'expired',
    current_period_end: sub?.current_period_end ?? null,
    trial_ends_at: sub?.trial_ends_at ?? null,
    reason,
    checked_at: new Date().toISOString(),
  });
};
