import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const keys = await redis.keys('ranking:*');
  for(const k of keys){ await redis.del(k); }
  res.json({ok:true, apagados: keys});
}
