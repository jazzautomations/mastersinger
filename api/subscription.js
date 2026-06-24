const { supabaseAdmin, getUserFromRequest, json } = require('./_lib/supabaseAdmin');
const { entitlementLabel, isSubscriptionActive } = require('./_lib/entitlements');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Não autenticado' });

  const admin = supabaseAdmin();
  if (!admin) return json(res, 500, { error: 'Backend não configurado' });

  const { data, error } = await admin
    .from('subscriptions')
    .select('user_id, plan, status, current_period_end, trial_ends_at, trial_used, teacher_code, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) return json(res, 500, { error: error.message });

  const active = isSubscriptionActive(data || null);
  return json(res, 200, {
    subscription: data || null,
    active,
    label: entitlementLabel(data || null),
  });
};
