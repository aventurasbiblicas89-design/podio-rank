import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const CATEGORIAS = ['marketing','advogados','medicos','dentistas','clinicas','academias','empresarios','infoprodutos','sites','youtube','x','instagram','tiktok'];
const SLOTS_PER_PAGE = 12; // você tava usando 12 no front, deixa 12
const MAX_SLOTS = 100;

export default async function handler(req,res){
  // Cache + anti-DDoS
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  let cat = String(req.query.cat || 'marketing').toLowerCase().slice(0,30);
  if(!CATEGORIAS.includes(cat)) cat = 'marketing';

  let page = parseInt(req.query.page || '1');
  if(isNaN(page) || page < 1 || page > 10) page = 1;

  // Rate limit leve
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const k = `rl:ranking:${ip}`;
  const c = await redis.incr(k);
  if(c===1) await redis.expire(k, 10);
  if(c>30) return res.status(429).json({});

  let rank = await redis.get(`ranking:${cat}`);
  if(typeof rank === 'string'){ try{ rank=JSON.parse(rank); }catch(e){ rank=null; } }

  if(!rank || Object.keys(rank).length===0){
    rank = {};
    let preco = 19.90;
    for(let i=10; i>=1; i--){
      rank[i] = { preco: Number(preco.toFixed(2)), nome: null, url: null, clicks: 0 };
      preco = preco * 1.3;
    }
    await redis.set(`ranking:${cat}`, JSON.stringify(rank));
  }

  // Sanitiza saída - NUNCA devolve HTML do usuário cru
  for(const pos in rank){
    if(rank[pos]?.nome){
      rank[pos].nome = String(rank[pos].nome).slice(0,80).replace(/[<>"']/g,'');
    }
    if(rank[pos]?.url){
      try{
        const u = new URL(rank[pos].url.startsWith('http')?rank[pos].url:'https://'+rank[pos].url);
        if(!['http:','https:'].includes(u.protocol)) rank[pos].url = '#';
      }catch{ rank[pos].url = '#'; }
    }
  }

  let maxPos = Math.max(...Object.keys(rank).map(k => parseInt(k)).filter(n=>!isNaN(n)));

  if(rank[maxPos]?.nome && maxPos < MAX_SLOTS){
    let lastPrice = rank[maxPos].preco;
    let preco = lastPrice / 1.3;
    for(let i = maxPos + 1; i <= Math.min(maxPos + 2, MAX_SLOTS); i++){
      if(preco < 9.90) preco = 9.90;
      if(!rank[i]) rank[i] = { preco: Number(preco.toFixed(2)), nome: null, url: null, clicks: 0 };
      preco = preco / 1.3;
    }
    await redis.set(`ranking:${cat}`, JSON.stringify(rank));
    maxPos = Math.max(...Object.keys(rank).map(k => parseInt(k)));
  }

  const start = (page - 1) * SLOTS_PER_PAGE + 1;
  const end = start + SLOTS_PER_PAGE - 1;

  let pageData = {};
  for(let i = start; i <= end; i++){
    if(rank[i]) pageData[i] = rank[i];
  }

  res.json(pageData);
}
