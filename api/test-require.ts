export default function handler(req: any, res: any) {
  // Test: basic function with NO imports at all, just env vars
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const asaas = process.env.ASAAS_ACCESS_TOKEN;
  res.status(200).json({ 
    ok: true, 
    hasSupabaseUrl: !!url,
    hasServiceKey: !!key,
    hasAsaasToken: !!asaas,
  });
}
