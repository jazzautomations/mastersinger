const pricing = require('./_lib/pricing');
export default function handler(req: any, res: any) {
  const plan = pricing.getPlan('pro-yearly');
  res.status(200).json({ ok: true, plan: plan?.name });
}
