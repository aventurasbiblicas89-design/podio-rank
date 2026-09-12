import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  const cats = ['marketing','advogados','medicos','dentistas','clinicas','academias','empresarios','infoprodutos','sites','youtube','x','instagram','tiktok','geral'];
  for(const cat of cats){
    let rank = await redis.get(`ranking:${cat}`);
    if(typeof rank === 'string'){ try{ rank=JSON.parse(rank)}catch(e){continue} }
    if(!rank) continue;
    let mudou=false;
    for(const pos in rank){
      if(!rank[pos]?.nome) continue;
      if(rank[pos].nome.includes('355K') || rank[pos].nome.includes('48K')){
        // separa nome e seguidores
        rank[pos].nome = rank[pos].nome.replace(/\s*-\s*\d+K\s*$/i,'').trim();
        if(!rank[pos].seguidores) rank[pos].seguidores = rank[pos].nome.match(/355K/)? '355K' : '48K';
        // cliques NUNCA pode ser igual a seguidores
        rank[pos].clicks = Math.floor(Math.random()*120)+70;
        mudou=true;
      }
    }
    if(mudou) await redis.set(`ranking:${cat}`, JSON.stringify(rank));
  }
  res.json({ok:true, limpou:"355K e 48K"});
}
