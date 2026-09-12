import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req,res){
  const cat = (req.query.cat || 'marketing').toLowerCase();
  const page = parseInt(req.query.page || '1');
  const SLOTS_PER_PAGE = 20; // <-- MUDEI DE 10 PRA 20
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

  let maxPos = Math.max(...Object.keys(rank).map(k => parseInt(k)));

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
