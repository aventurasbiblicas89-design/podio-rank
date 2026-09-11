import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
const INICIAL = {10:{n:"Seu Primeiro",v:10,url:"https://google.com"},9:{n:"Exemplo 9",v:13,url:""},8:{n:"Exemplo 8",v:17,url:""},7:{n:"Exemplo 7",v:22,url:""},6:{n:"Exemplo 6",v:29,url:""},5:{n:"Exemplo 5",v:38,url:""},4:{n:"Exemplo 4",v:49,url:""},3:{n:"Exemplo 3",v:64,url:""},2:{n:"Exemplo 2",v:83,url:""},1:{n:"TOPO - MAIS CARO",v:108,url:""}};
export default async function handler(req,res){
  if(req.method==='GET'){ let r=await redis.get('ranking'); if(!r){await redis.set('ranking',INICIAL); r=INICIAL;} return res.json(r); }
  if(req.method==='POST'){ const {pos,nome,url,preco}=req.body; let rank=await redis.get('ranking')||INICIAL; rank[pos]={n:nome,v:preco,url:url}; await redis.set('ranking',rank); return res.json({ok:true}); }
}
