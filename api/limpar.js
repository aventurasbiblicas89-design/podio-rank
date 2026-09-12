import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  const cats = ['marketing','advogados','medicos','dentistas','clinicas','academias','empresarios','infoprodutos','sites','youtube','x','instagram','tiktok'];
  for(const c of cats) await redis.del(`ranking:${c}`);
  res.json({ok:true, apagado:cats});
}
