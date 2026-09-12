import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

function limpaNome(nome){
  if(!nome) return null;
  return String(nome).trim()
  .replace(/\s*-\s*\d+K\b/gi,'')
  .replace(/\s*\d+K\b/gi,'')
  .split(' - ')[0].trim();
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate');
  const { category = 'marketing' } = req.query;
  const key = `ranking:${category}`;
  let data = await redis.get(key);
  if(typeof data === 'string'){ try{ data = JSON.parse(data); }catch{ data = null; } }
  if(!data || typeof data!== 'object' || Object.keys(data).length===0){
    return res.json({});
  }
  // limpa nomes sujos e zera clicks absurdos
  for(const k of Object.keys(data)){
    if(data[k]?.nome){
      data[k].nome = limpaNome(data[k].nome);
      if(data[k].clicks > 5000) data[k].clicks = 0;
    }
  }
  return res.json(data);
}
