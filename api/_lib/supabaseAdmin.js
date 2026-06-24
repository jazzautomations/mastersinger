const { createClient } = require('@supabase/supabase-js');

let cached = null;

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

async function getUserFromRequest(req) {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const auth = req.headers && (req.headers.authorization || req.headers.Authorization);
  const raw = Array.isArray(auth) ? auth[0] : auth;
  if (typeof raw !== 'string' || !raw.startsWith('Bearer ')) return null;
  const token = raw.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return { id: data.user.id, email: data.user.email || null };
}

function isBackendConfigured() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!(url && key);
}

function json(res, status, body) {
  res.status(status);
  return res.json(body);
}

module.exports = { supabaseAdmin, getUserFromRequest, isBackendConfigured, json };
