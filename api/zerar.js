import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  await redis.set('ranking:marketing', JSON.stringify({}));
  await redis.set('ranking:youtube', JSON.stringify({}));
  await redis.set('ranking:advogados', JSON.stringify({}));
  await redis.set('ranking:medicos', JSON.stringify({}));
  return res.json({ok:true, msg:'Tudo zerado - #1 por R$95 liberado'});
}
