import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  let del = 0;
  for(let cat of ['marketing','advogados','medicos','dentistas','clinicas','academias','empresarios','infoprodutos','sites','youtube','x','instagram','tiktok']){
    let r = await redis.get(`ranking:${cat}`);
    if(typeof r==='string') try{ r=JSON.parse(r); }catch{}
    let novo = {};
    for(let i=1;i<=12;i++) novo[i]={preco: i===1?95 : i<=3?65 : 35};
    await redis.set(`ranking:${cat}`, JSON.stringify(novo));
    del++;
  }
  res.json({ok:true, msg:`Zerado! ${del} categorias com #1 por R$95`});
}
