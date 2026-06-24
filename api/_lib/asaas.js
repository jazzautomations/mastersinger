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
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (_e) { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Asaas ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function findOrCreateCustomer(email, name) {
  const list = await asaas(`/customers?email=${encodeURIComponent(email)}`);
  if (list.data && list.data.length > 0) return list.data[0];
  const created = await asaas('/customers', {
    method: 'POST',
    body: JSON.stringify({ name: (name && name.trim()) || email.split('@')[0], email }),
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

async function getPayment(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error('Invalid payment ID format');
  }
  return asaas(`/payments/${id}`);
}

module.exports = { findOrCreateCustomer, createPayment, getPayment };
