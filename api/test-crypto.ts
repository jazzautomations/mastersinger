import { timingSafeEqual } from 'crypto';
export default function handler(req: any, res: any) {
  const a = Buffer.from('test');
  const b = Buffer.from('test');
  res.status(200).json({ ok: true, safe: timingSafeEqual(a, b) });
}
