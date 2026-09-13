import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const limite = Date.now() - 30000;
    await kv.zremrangebyscore('presence', 0, limite);
    const online = await kv.zcard('presence');
    return res.status(200).json({ online: Math.max(online, 1) });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ online: 1 });
  }
}
