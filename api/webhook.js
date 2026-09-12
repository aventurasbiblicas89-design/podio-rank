import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  if(req.method!== 'POST') return res.status(405).end();
  const body = req.body;
  if(body.type === 'payment'){
    const id = body.data.id;
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, { headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` } });
    const pay = await mpRes.json();
    if(pay.status === 'approved'){
      const { pos, nome, url, cat } = pay.metadata || {};
      const categoria = (cat || 'marketing').toLowerCase();
      const valor = Number(pay.transaction_amount);
      let rank = await redis.get(`ranking:${categoria}`);
      if(typeof rank === 'string'){ try{ rank=JSON.parse(rank); }catch(e){} }
      if(!rank) rank = {};
      rank[pos] = { preco: valor, nome, url, clicks: 0, data: new Date().toISOString() };
      await redis.set(`ranking:${categoria}`, JSON.stringify(rank));
    }
  }
  res.status(200).end();
}

