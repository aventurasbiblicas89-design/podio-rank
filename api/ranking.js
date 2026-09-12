import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req,res){
  const cat = (req.query.cat || 'marketing').toLowerCase();
  const page = parseInt(req.query.page || '1');
  const SLOTS_PER_PAGE = 10;
  const MAX_SLOTS = 100;

  let rank = await redis.get(`ranking:${cat}`);
  if(typeof rank === 'string'){ try{ rank=JSON.parse(rank); }catch(e){} }

  if(!rank || Object.keys(rank).length===0){
    rank = {};
    let preco = 19.90;
    for(let i=10; i>=1; i--){
      rank[i] = { preco: Number(preco.toFixed(2)), nome: null, url: null, clicks: 0 };
      preco = preco * 1.3;
    }
  }

  // === CORREÇÃO DA EXPANSÃO ===
  let maxPos = Math.max(...Object.keys(rank).map(k => parseInt(k)));

  // Expande se a ÚLTIMA posição estiver ocupada (não precisa estar tudo ocupado)
  if(rank[maxPos]?.nome && maxPos < MAX_SLOTS){
    let lastPrice = rank[maxPos].preco;
    let preco = lastPrice / 1.3;
    let newSlots = {};
    for(let i = maxPos + 1; i <= Math.min(maxPos + 10, MAX_SLOTS); i++){
      if(preco < 9.90) preco = 9.90;
      newSlots[i] = { preco: Number(preco.toFixed(2)), nome: null, url: null, clicks: 0 };
      preco = preco / 1.3;
    }
    rank = {...rank,...newSlots };
    maxPos = Math.max(...Object.keys(rank).map(k => parseInt(k)));
    await redis.set(`ranking:${cat}`, JSON.stringify(rank));
  }

  // === PAGINAÇÃO ===
  const start = (page - 1) * SLOTS_PER_PAGE + 1;
  const end = start + SLOTS_PER_PAGE - 1;

  let pageData = {};
  for(let i = start; i <= end; i++){
    if(rank[i]) pageData[i] = rank[i];
  }

  // Retorna só as posições pra não quebrar seu front
  // A paginação vai via header
  res.setHeader('X-Total-Positions', maxPos);
  res.setHeader('X-Total-Pages', Math.ceil(maxPos / SLOTS_PER_PAGE));
  res.setHeader('X-Current-Page', page);

  res.json(pageData);
}
