export default async function h(req,res){
  const { Redis } = await import('@upstash/redis');
  const redis = Redis.fromEnv();
  let cats=['marketing','advogados','medicos','dentistas','clinicas','academias','empresarios','infoprodutos','sites','youtube','x','instagram','tiktok'];
  for(let c of cats){
    let n={}; for(let i=1;i<=12;i++) n[i]={preco:i==1?95:i<=3?65:35};
    await redis.set(`ranking:${c}`, JSON.stringify(n));
  }
  res.json({ok:true, msg:'Zerado por R$95'});
}
