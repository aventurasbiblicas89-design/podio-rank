import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  const cat = 'marketing';
  let rank = await redis.get(`ranking:${cat}`);
  if(typeof rank === 'string') rank = JSON.parse(rank);

  // Mantém só o #10 do Pedro e apaga #5-#9 livres que estão atrapalhando
  let novoRank = {};
  // Recria #1 a #9 vazios com preço certo
  let preco = 19.90;
  let temp = {};
  for(let i=10; i>=1; i--){
    temp[i] = { preco: Number(preco.toFixed(2)), nome: null, url: null, clicks: 0 };
    preco = preco * 1.3;
  }
  // Mantém o Pedro no #10
  temp[10] = rank[10]; // Pedro Henrique

  // Cria #11 barata
  temp[11] = { preco: 15.30, nome: null, url: null, clicks: 0 };
  temp[12] = { preco: 11.77, nome: null, url: null, clicks: 0 };

  await redis.set(`ranking:${cat}`, JSON.stringify(temp));
  res.json({ ok: true, novo: temp });
}
