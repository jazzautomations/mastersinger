import { getPlan } from './_lib/pricing';
export default function handler(req: any, res: any) {
  const plan = getPlan('pro-yearly');
  res.status(200).json({ ok: true, plan: plan?.name });
}
