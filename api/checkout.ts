import { supabaseAdmin, getUserFromRequest, json } from './_lib/supabaseAdmin';
import { findOrCreateCustomer, createPayment } from './_lib/asaas';
import { getPlan, type PlanId } from '../data/pricing';

// POST /api/checkout  { planId: 'pro-monthly' | 'pro-yearly' }
//   Authorization: Bearer <supabase access_token>
// → { invoiceUrl, paymentId }
// Creates a one-time Asaas charge (payer chooses Pix/card/boleto on checkout).
// Includes idempotency: if a pending CHECKOUT_CREATED event exists for this
// user+plan, returns the existing invoice URL instead of creating a duplicate.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Não autenticado. Faça login para assinar.' });

  const { planId } = req.body || {};
  if (typeof planId !== 'string') {
    return json(res, 400, { error: 'planId inválido.' });
  }
  const plan = getPlan(planId as PlanId);
  if (!plan || plan.price === 0 || !plan.billingCycle) {
    return json(res, 400, { error: 'Plano inválido para checkout.' });
  }

  const admin = supabaseAdmin();
  if (!admin) return json(res, 500, { error: 'Backend não configurado (SUPABASE_SERVICE_ROLE_KEY ausente).' });

  try {
    // ── Idempotency: check for existing pending checkout ──
    const { data: existing } = await admin.from('payment_events')
      .select('payload, asaas_payment_id')
      .eq('user_id', user.id)
      .eq('event_type', 'CHECKOUT_CREATED')
      .eq('plan', plan.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.payload?.invoiceUrl) {
      return json(res, 200, { invoiceUrl: existing.payload.invoiceUrl, paymentId: existing.asaas_payment_id });
    }

    if (!user.email || !user.email.includes('@')) {
      return json(res, 400, { error: 'E-mail inválido na conta. Atualize seu perfil.' });
    }

    const customer = await findOrCreateCustomer(user.email);
    const dueDate = new Date().toISOString().slice(0, 10);
    const payment = await createPayment({
      customer: customer.id,
      value: plan.price,
      dueDate,
      description: `MasterSinger ${plan.name}`,
      externalReference: user.id,
    });

    // Audit the checkout intent. The webhook activates access on PAYMENT_RECEIVED.
    const { error: insertError } = await admin.from('payment_events').insert({
      user_id: user.id,
      asaas_payment_id: payment.id,
      plan: plan.id,
      amount: plan.price,
      status: payment.status,
      event_type: 'CHECKOUT_CREATED',
      payload: { invoiceUrl: payment.invoiceUrl, billingCycle: plan.billingCycle },
    });
    if (insertError) console.error('payment_events insert failed:', insertError.message);

    // Remember the pending plan + Asaas ids so the webhook can complete activation.
    await admin.from('subscriptions').upsert({
      user_id: user.id,
      plan: plan.id,
      asaas_payment_id: payment.id,
      asaas_customer_id: customer.id,
    }, { onConflict: 'user_id' });

    return json(res, 200, { invoiceUrl: payment.invoiceUrl, paymentId: payment.id });
  } catch (e: any) {
    console.error('checkout error', e);
    return json(res, 500, { error: 'Falha ao criar cobrança.' });
  }
}
