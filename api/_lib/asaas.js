const BASE = () => {
  const url = process.env.ASAAS_BASE_URL;
  if (!url) throw new Error('ASAAS_BASE_URL not configured — refusing to default to sandbox');
  return url;
};
const TOKEN = () => process.env.ASAAS_ACCESS_TOKEN;

function authHeaders() {
  const token = TOKEN();
  if (!token) throw new Error('ASAAS_ACCESS_TOKEN not configured');
  return { access_token: token, 'Content-Type': 'application/json' };
}

async function asaas(path, init) {
  init = init || {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(`${BASE()}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...(init.headers || {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (_e) { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Asaas ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function findOrCreateCustomer(email, name, cpfCnpj) {
  const list = await asaas(`/customers?email=${encodeURIComponent(email)}`);
  if (list.data && list.data.length > 0) {
    const existing = list.data[0];
    if (cpfCnpj && !existing.cpfCnpj) {
      const updated = await asaas(`/customers/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ cpfCnpj }),
      });
      return updated;
    }
    return existing;
  }
  const body = { name: (name && name.trim()) || email.split('@')[0], email };
  if (cpfCnpj) body.cpfCnpj = cpfCnpj;
  const created = await asaas('/customers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return created;
}

async function createPayment(opts) {
  return asaas('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: opts.customer,
      billingType: 'UNDEFINED',
      value: opts.value,
      dueDate: opts.dueDate,
      description: opts.description,
      externalReference: opts.externalReference,
    }),
  });
}

async function createRecurringCardSubscription(opts) {
  const body = {
    customer: opts.customer,
    billingType: 'CREDIT_CARD',
    cycle: opts.cycle,
    value: opts.value,
    description: opts.description,
    externalReference: opts.externalReference,
    dueDateLimitDays: 5,
    creditCardHolderInfo: opts.creditCardHolderInfo,
    creditCard: opts.creditCard,
  };
  return asaas('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function getPayment(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error('Invalid payment ID format');
  }
  return asaas(`/payments/${id}`);
}

// ── Recurring subscription checkout (cartão de crédito, cobrança automática).
//    Cria uma Checkout Session no Asaas: o cliente paga numa página segura do
//    Asaas (só cartão de crédito) e o Asaas cria a assinatura recorrente. A
//    cada ciclo (mensal/anual) o Asaas cobra o cartão automaticamente e dispara
//    PAYMENT_RECEIVED no webhook → renovamos o acesso Pro. Não capturamos dados
//    de cartão no nosso backend (fora do escopo PCI).
//    cycle: 'MONTHLY' | 'YEARLY'
async function createSubscriptionCheckout(opts) {
  const body = {
    billingTypes: ['CREDIT_CARD'],
    chargeTypes: ['RECURRENT'],
    minutesToExpire: 60,
    externalReference: opts.externalReference,
    callback: {
      successUrl: opts.successUrl,
      cancelUrl: opts.cancelUrl,
      expiredUrl: opts.expiredUrl,
    },
    items: [{
      name: opts.name,
      description: opts.description,
      quantity: 1,
      value: opts.value,
    }],
    subscription: {
      cycle: opts.cycle,
      nextDueDate: opts.nextDueDate,
    },
  };
  if (opts.email || opts.cpfCnpj) {
    body.customerData = {
      name: opts.name || (opts.email ? opts.email.split('@')[0] : 'Cliente'),
      email: opts.email,
      cpfCnpj: opts.cpfCnpj,
    };
  }
  return asaas('/checkouts', { method: 'POST', body: JSON.stringify(body) });
}

module.exports = { findOrCreateCustomer, createPayment, createRecurringCardSubscription, getPayment, createSubscriptionCheckout };
