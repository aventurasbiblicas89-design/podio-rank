import { kv } from '@vercel/kv';
const INICIAL = {10:{n:"Pedro @mercado",v:15,url:""},9:{n:"Livre",v:20,url:""},8:{n:"Livre",v:26,url:""},7:{n:"Livre",v:34,url:""},6:{n:"Livre",v:44,url:""},5:{n:"Livre",v:57,url:""},4:{n:"Livre",v:74,url:""},3:{n:"Livre",v:96,url:""},2:{n:"Livre",v:125,url:""},1:{n:"Livre",v:163,url:""}};
export default async function handler(req,res){
  if(req.method==='GET'){ let r=await kv.get('ranking'); if(!r){await kv.set('ranking',INICIAL); r=INICIAL;} return res.json(r); }
  if(req.method==='POST'){ const {pos,nome,url,preco}=req.body; let rank=await kv.get('ranking')||INICIAL; rank[pos]={n:nome,v:preco,url:url}; await kv.set('ranking',rank); return res.json({ok:true}); }
}
