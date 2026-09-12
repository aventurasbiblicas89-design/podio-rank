import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  const today = new Date().toISOString().slice(0,10);
  const cat = (req.query.cat || 'all').toLowerCase();
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || Math.random().toString();
  await redis.set(`online:${ip}`, Date.now(), { ex: 120 });
  await redis.incr(`visits:${today}:${cat}`);
  const keys = await redis.keys('online:*');
  const visitorsToday = await redis.get(`visits:${today}:${cat}`) || 0;
  res.json({ online: keys.length, visitorsToday: Number(visitorsToday) });
}
