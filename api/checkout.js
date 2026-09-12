import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  if(req.method!== 'POST') return res.status(405).end();
  const { pos, nome, url, cat } = req.body;
  const categoria = (cat || 'marketing').toLowerCase();
  let rank = await redis.get(`ranking:${categoria}`);
  if(typeof rank === 'string'){ try{ rank=JSON.parse(rank); }catch(e){} }
  if(!rank) rank = {};
  const atual = rank[pos]?.preco || 19.90;
  const novoPreco = Number((atual * 1.3).toFixed(2));
  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ title: `Posicao #${pos} - ${categoria}`, quantity: 1, unit_price: novoPreco }],
      metadata: { pos: String(pos), nome, url, cat: categoria },
      back_urls: { success: `https://podiorank.com.br/?cat=${categoria}`, failure: `https://podiorank.com.br/?cat=${categoria}` },
      notification_url: `https://podiorank.com.br/api/webhook`,
      auto_return: 'approved'
    })
  });
  const data = await mpRes.json();
  res.json({ init_point: data.init_point, price: novoPreco });
}
