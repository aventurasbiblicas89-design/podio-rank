import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req, res){
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma','no-cache');

  const { category = 'marketing' } = req.query;
  const key = `ranking:${category}`;

  let data = await redis.get(key);
  if(typeof data === 'string'){
    try{ data = JSON.parse(data); }catch(e){ data = null; }
  }

  // Se não tem nada no Redis, retorna vazio - NÃO cria fake
  if(!data ||!Array.isArray(data) || data.length === 0){
    return res.json([]);
  }

  // Limpa qualquer nome que ainda tenha - 355K ou 48K
  const limpo = data.map(item => {
    if(!item) return null;
    if(item.nome){
      let nomeLimpo = String(item.nome).replace(/\s*-\s*\d+K/gi,'').replace(/\d+K/gi,'').trim();
      // remove o - 355K do final
      nomeLimpo = nomeLimpo.split(' - ')[0].trim();
      return {...item, nome: nomeLimpo || item.nome, clicks: item.clicks > 1000? 50 : item.clicks};
    }
    return item;
  }).filter(Boolean);

  return res.json(limpo);
}
