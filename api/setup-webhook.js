const { json } = require('./_lib/supabaseAdmin');

// POST /api/setup-webhook  — ENDPOINT TEMPORÁRIO.
// Recria o webhook no Asaas usando os tokens reais das env vars da Vercel.
// Protegido pelo ASAAS_WEBHOOK_SECRET. APAGAR após uso.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const secret = process.env.ASAAS_WEBHOOK_SECRET;
  const token = process.env.ASAAS_ACCESS_TOKEN;
  const baseUrl = process.env.ASAAS_BASE_URL || 'https://www.asaas.com/api/v3';
  if (!secret || !token) return json(res, 500, { error: 'Env vars ausentes' });

  // Proteção: requer o secret no body pra executar.
  const { confirm } = req.body || {};
  if (confirm !== secret) return json(res, 403, { error: 'Confirm token inválido' });

  try {
    // 1. Lista webhooks existentes
    const listRes = await fetch(`${baseUrl}/webhooks`, {
      headers: { access_token: token, 'Content-Type': 'application/json' },
    });
    const listData = await listRes.json();
    const existing = (listData.data || []).filter(w =>
      w.url && w.url.includes('mastersinger')
    );
    const result = { existing: existing.map(w => ({ id: w.id, url: w.url, enabled: w.enabled })) };

    // 2. Se já existe um webhook ativo pro MasterSinger, não duplica.
    if (existing.some(w => w.enabled)) {
      return json(res, 200, { ...result, action: 'already_exists', message: 'Webhook já existe e está ativo.' });
    }

    // 3. Cria o webhook
    const createRes = await fetch(`${baseUrl}/webhooks`, {
      method: 'POST',
      headers: { access_token: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'MasterSinger Webhook',
        url: 'https://mastersinger.vercel.app/api/asaas-webhook',
        email: 'jazzautomations@gmail.com',
        enabled: true,
        interrupted: false,
        authToken: secret,
        sendType: 'SEQUENTIALLY',
        events: ['PAYMENT_CREATED', 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_OVERDUE'],
      }),
    });
    const created = await createRes.json();
    if (!createRes.ok) {
      return json(res, 502, { ...result, action: 'create_failed', error: created });
    }
    return json(res, 200, {
      ...result,
      action: 'created',
      webhook: { id: created.id, url: created.url, enabled: created.enabled, events: created.events },
    });
  } catch (e) {
    return json(res, 500, { error: 'Falha', detail: e.message });
  }
};
