import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  // pega TODAS as chaves ranking:*
  const keys = await redis.keys('ranking:*');
  let total = 0;
  for(const key of keys){
    let rank = await redis.get(key);
    if(typeof rank === 'string'){ try{ rank=JSON.parse(rank) }catch(e){ continue } }
    if(!rank) continue;
    let mudou = false;
    for(const pos in rank){
      const it = rank[pos];
      if(!it?.nome) continue;
      const n = String(it.nome);
      if(n.includes('355K') || n.includes('48K') || (it.clicks||0) >= 1000){
        it.nome = n.replace(/\s*-\s*355K/gi,'').replace(/\s*-\s*48K/gi,'').replace(/355K/gi,'').replace(/48K/gi,'').trim().split(' - ')[0].trim() || 'Além dos Versículos';
        it.clicks = Math.floor(Math.random()*90)+30;
        mudou = true; total++;
      }
    }
    if(mudou) await redis.set(key, JSON.stringify(rank));
  }
  res.json({ok:true, keys: keys, limpos: total});
}
