import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  const cat = (req.query.cat || 'marketing').toLowerCase();
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
  res.json(rank);
}
