const { supabaseAdmin } = require('./_lib/supabaseAdmin');
const { getPayment } = require('./_lib/asaas');
const { getPlan } = require('./_lib/pricing');
const { timingSafeEqual } = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405);
    return res.json({ error: 'Method not allowed' });
  }

  const secret = process.env.ASAAS_WEBHOOK_SECRET;
  if (!secret) {
    res.status(500);
    return res.json({ error: 'ASAAS_WEBHOOK_SECRET não configurado' });
  }

  // Asaas sends the auth token in the `asaas-access-token` header (official doc:
  // https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook).
  // Vercel normalizes header names to lowercase, so we read the lowercase form.
  const headerSecret = req.headers['asaas-access-token'];
  if (typeof headerSecret !== 'string') {
    res.status(401);
    return res.json({ error: 'Assinatura inválida' });
  }
  const a = Buffer.from(headerSecret);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401);
    return res.json({ error: 'Assinatura inválida' });
  }

  const admin = supabaseAdmin();
  if (!admin) {
    res.status(500);
    return res.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' });
  }

  const event = req.body || {};
  const paymentId = (event && event.payment && event.payment.id) || event.paymentId || event.id;
  if (!paymentId) {
    res.status(400);
    return res.json({ error: 'paymentId ausente' });
  }

  try {
    const payment = await getPayment(paymentId);
    let userId = String(payment.externalReference || '');
    if (!userId && payment.customer) {
      const { data: byCustomer } = await admin.from('subscriptions')
        .select('user_id').eq('asaas_customer_id', payment.customer).maybeSingle();
      if (byCustomer && byCustomer.user_id) userId = byCustomer.user_id;
    }
    if (!userId) {
      res.status(400);
      return res.json({ error: 'externalReference ausente no pagamento' });
    }

    const activated = payment.status === 'RECEIVED' || payment.status === 'CONFIRMED' || payment.status === 'RECEIVED_IN_CASH';

    if (activated) {
      const { data: already } = await admin.from('payment_events')
        .select('id').eq('asaas_payment_id', paymentId).eq('event_type', 'PAYMENT_RECEIVED').maybeSingle();
      if (already) {
        res.status(200);
        return res.json({ ok: true, dedupe: true });
      }
    }

    const { error: insertError } = await admin.from('payment_events').insert({
      user_id: userId,
      asaas_payment_id: payment.id,
      amount: payment.value,
      status: payment.status,
      event_type: activated ? 'PAYMENT_RECEIVED' : 'PAYMENT_UPDATE',
      payload: event,
    });
    if (insertError) console.error('webhook: payment_events insert failed:', insertError.message);

    if (activated) {
      // Renovação de assinatura recorrente (cartão de crédito): quando o Asaas
      // cobra mensalmente/anualmente, este campo vem preenchido com o id da
      // subscription. Detectamos e renovamos o período do usuário.
      const isRenewal = !!payment.subscription;
      const { data: intent } = await admin.from('payment_events')
        .select('plan').eq('asaas_payment_id', paymentId).eq('event_type', 'CHECKOUT_CREATED').maybeSingle();
      const planId = (intent && intent.plan)
        || (payment.value >= 300 ? 'pro-yearly' : 'pro-monthly');
      const plan = getPlan(planId);
      const days = plan && plan.billingCycle === 'yearly' ? 365 : 30;

      // Para renovação: estende a partir do fim do período atual (se ainda
      // válido) ou de hoje. Para ativação nova: a partir de hoje.
      const { data: currentSub } = await admin.from('subscriptions')
        .select('current_period_end').eq('user_id', userId).maybeSingle();
      let base = Date.now();
      if (isRenewal && currentSub && currentSub.current_period_end) {
        const endMs = new Date(currentSub.current_period_end).getTime();
        if (endMs > Date.now()) base = endMs; // estende o período ainda ativo
      }
      const periodEnd = new Date(base + days * 86400000).toISOString();

      const { error } = await admin.from('subscriptions').upsert({
        user_id: userId,
        plan: planId,
        status: 'active',
        current_period_end: periodEnd,
        trial_ends_at: null,
        asaas_payment_id: payment.id,
        asaas_customer_id: payment.customer,
        asaas_subscription_id: payment.subscription || null,
      }, { onConflict: 'user_id' });
      if (error) throw error;
    }

    res.status(200);
    return res.json({ ok: true, activated });
  } catch (e) {
    console.error('webhook error', e);
    res.status(500);
    return res.json({ error: 'Falha no webhook' });
  }
};
