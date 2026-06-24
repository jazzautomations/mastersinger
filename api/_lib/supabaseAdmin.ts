import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

// Service-role client — bypasses RLS. SERVER ONLY (never bundle to browser).
// Falls back to VITE_SUPABASE_URL so local dev with a single var also works.
export function supabaseAdmin(): SupabaseClient | null {
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

export type AuthResult =
  | { ok: true; user: { id: string; email: string | null } }
  | { ok: false; reason: 'missing_env' | 'no_token' | 'invalid_token' };

// Validate the caller's Supabase JWT from the Authorization header and return
// the authenticated user id + email. Distinguishes between server misconfig,
// missing token, and invalid token.
export async function getUserFromRequest(req: any): Promise<{ id: string; email: string | null } | null> {
  const admin = supabaseAdmin();
  if (!admin) return null; // server misconfigured — callers should return 500
  const auth = req.headers?.authorization || req.headers?.Authorization;
  const raw = Array.isArray(auth) ? auth[0] : auth;
  if (typeof raw !== 'string' || !raw.startsWith('Bearer ')) return null;
  const token = raw.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

// Check if backend env vars are configured (for distinguishing 500 vs 401).
export function isBackendConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return !!(url && key);
}

export function json(res: any, status: number, body: unknown) {
  res.status(status);
  return res.json(body);
}
