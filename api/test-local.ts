import { TEST_VALUE } from './_lib/test-const';
export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, value: TEST_VALUE });
}
