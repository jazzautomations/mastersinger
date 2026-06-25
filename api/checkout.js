const { supabaseAdmin, getUserFromRequest, json } = require('./_lib/supabaseAdmin');
const { findOrCreateCustomer, createSubscriptionCheckout } = require('./_lib/asaas');
const { getPlan } = require('./_lib/pricing');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Não autenticado. Faça login para assinar.' });

  const { planId, cpfCnpj } = req.body || {};
  if (typeof planId !== 'string') {
    return json(res, 400, { error: 'planId inválido.' });
  }
  const digits = typeof cpfCnpj === 'string' ? cpfCnpj.replace(/\D/g, '') : '';
  if (digits.length !== 11 && digits.length !== 14) {
    return json(res, 400, { error: 'CPF ou CNPJ é obrigatório para assinatura com cartão.' });
  }
  const plan = getPlan(planId);
  if (!plan || plan.price === 0 || !plan.billingCycle) {
    return json(res, 400, { error: 'Plano inválido para checkout.' });
  }

  const admin = supabaseAdmin();
  if (!admin) return json(res, 500, { error: 'Backend não configurado (SUPABASE_SERVICE_ROLE_KEY ausente).' });

  try {
    const { data: existing } = await admin.from('payment_events')
      .select('payload, asaas_payment_id')
      .eq('user_id', user.id)
      .eq('event_type', 'CHECKOUT_CREATED')
      .eq('plan', plan.id)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && existing.payload && existing.payload.checkoutUrl) {
      try {
        const url = new URL(existing.payload.checkoutUrl);
        const ALLOWED = ['asaas.com', 'asaas.com.br'];
        const host = url.hostname.toLowerCase();
        const ok = url.protocol.startsWith('http') && ALLOWED.some(d => host === d || host.endsWith('.' + d));
        if (ok) {
          return json(res, 200, { checkoutUrl: existing.payload.checkoutUrl, checkoutId: existing.asaas_payment_id });
        }
      } catch (_e) {}
    }

    if (!user.email || !user.email.includes('@')) {
      return json(res, 400, { error: 'E-mail inválido na conta. Atualize seu perfil.' });
    }

    const customer = await findOrCreateCustomer(user.email, null, digits);
    const appBase = 'https://mastersinger.vercel.app';
    const cycle = plan.billingCycle === 'monthly' ? 'MONTHLY' : 'YEARLY';
    const checkout = await createSubscriptionCheckout({
      customerId: customer.id,
      email: user.email,
      cpfCnpj: digits,
      name: `MasterSinger ${plan.name}`,
      description: `MasterSinger ${plan.name}`,
      value: plan.price,
      cycle,
      nextDueDate: new Date().toISOString().slice(0, 10),
      successUrl: `${appBase}/#app?checkout=success&plan=${encodeURIComponent(plan.id)}`,
      cancelUrl: `${appBase}/#app?checkout=cancelled&plan=${encodeURIComponent(plan.id)}`,
      expiredUrl: `${appBase}/#app?checkout=expired&plan=${encodeURIComponent(plan.id)}`,
    });

    const checkoutUrl = checkout.checkoutUrl || checkout.url || checkout.paymentLink || checkout.link || checkout.invoiceUrl;
    if (!checkoutUrl) {
      throw new Error('Asaas não retornou checkoutUrl');
    }

    const { error: insertError } = await admin.from('payment_events').insert({
      user_id: user.id,
      asaas_payment_id: checkout.id || checkout.checkoutId || checkout.paymentLinkId || null,
      plan: plan.id,
      amount: plan.price,
      status: 'CHECKOUT_CREATED',
      event_type: 'CHECKOUT_CREATED',
      payload: { checkoutUrl, cycle, billingType: 'CREDIT_CARD', chargeType: 'RECURRENT' },
    });
    if (insertError) console.error('payment_events insert failed:', insertError.message);

    await admin.from('subscriptions').upsert({
      user_id: user.id,
      plan: plan.id,
      asaas_payment_id: checkout.id || checkout.checkoutId || null,
      asaas_customer_id: customer.id,
    }, { onConflict: 'user_id' });

    return json(res, 200, { checkoutUrl, checkoutId: checkout.id || checkout.checkoutId || null });
  } catch (e) {
    console.error('checkout error', e);
    const detail = e && e.message ? e.message : String(e);
    return json(res, 500, { error: 'Falha ao criar cobrança.', detail });
  }
};
