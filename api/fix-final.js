import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  let rank = await redis.get('ranking:marketing');
  if(typeof rank==='string') rank=JSON.parse(rank);

  // Trava #4 ao #9 como ocupado fake pra criar escassez
  for(let i=4;i<=9;i++){
    if(rank[i]) {
      rank[i].nome = `TOP ${i} - RESERVADO`;
      rank[i].url = "https://podiorank.com.br";
      rank[i].preco = Number((19.90 * Math.pow(1.3, 10-i)).toFixed(2));
    }
  }
  // Garante #11 e #12 livres
  rank[11] = { preco: 15.30, nome: null, url: null, clicks: 0 };
  rank[12] = { preco: 11.77, nome: null, url: null, clicks: 0 };

  await redis.set('ranking:marketing', JSON.stringify(rank));
  res.json({ok:true, rank});
}
