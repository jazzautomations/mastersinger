import { supabaseAdmin } from './_lib/supabaseAdmin';
export default function handler(req: any, res: any) {
  const admin = supabaseAdmin();
  res.status(200).json({ ok: true, configured: !!admin });
}
