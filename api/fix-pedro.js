import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  let rank = await redis.get('ranking:youtube');
  if(typeof rank === 'string'){ try{ rank=JSON.parse(rank); }catch(e){} }
  if(!rank) rank = {};
  rank[10] = {
    nome: "PEDRO HENRIQUE / MEME-ZINHO",
    url: "https://youtube.com/@meme-zinho?si=VnRDBaijlDCtGv0e",
    preco: 19.90,
    clicks: 127,
    paid_at: new Date().toISOString()
  };
  await redis.set('ranking:youtube', JSON.stringify(rank));
  res.json({ ok: true, message: "Colocado com barra /", rank });
}

