// ──────────────────────────────────────────────────────────────────────────
// Asaas client (server-side). Reads ASAAS_ACCESS_TOKEN from env.
// Asaas authenticates with the `access_token` header (not Bearer).
// ──────────────────────────────────────────────────────────────────────────

const BASE = () => process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';
const TOKEN = () => process.env.ASAAS_ACCESS_TOKEN;

export interface AsaasCustomer { id: string; name?: string; email?: string; }
export interface AsaasPayment {
  id: string;
  invoiceUrl: string;
  value: number;
  status: string;
  billingType: string;
  customer: string;
  externalReference?: string;
  [k: string]: unknown;
}

function authHeaders(): Record<string, string> {
  const token = TOKEN();
  if (!token) throw new Error('ASAAS_ACCESS_TOKEN not configured');
  return { access_token: token, 'Content-Type': 'application/json' };
}

async function asaas<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE()}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers as Record<string, string> || {}) },
  });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Asaas ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as T;
}

// Find an existing Asaas customer by email, or create one.
export async function findOrCreateCustomer(email: string, name?: string): Promise<AsaasCustomer> {
  const list = await asaas<{ data: AsaasCustomer[] }>(`/customers?email=${encodeURIComponent(email)}`);
  if (list.data && list.data.length > 0) return list.data[0];
  const created = await asaas<AsaasCustomer>(`/customers`, {
    method: 'POST',
    body: JSON.stringify({ name: name?.trim() || email.split('@')[0], email }),
  });
  return created;
}

// Create a one-time charge. billingType 'UNDEFINED' lets the payer pick
// Pix / card / boleto on the Asaas checkout page.
export async function createPayment(opts: {
  customer: string;
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
}): Promise<AsaasPayment> {
  return asaas<AsaasPayment>(`/payments`, {
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

// Re-fetch a payment — used by the webhook to PROVE authenticity (anti-forgery).
export async function getPayment(id: string): Promise<AsaasPayment> {
  return asaas<AsaasPayment>(`/payments/${id}`);
}
