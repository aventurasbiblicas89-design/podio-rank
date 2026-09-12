import { Redis } from '@upstash/redis';
import { MercadoPagoConfig, Preference } from 'mercadopago';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  const { pos, nome, url, cat } = req.body;
  const categoria = (cat || 'marketing').toLowerCase();
  let rank = await redis.get(`ranking:${categoria}`);
  if(typeof rank === 'string'){ try{ rank=JSON.parse(rank); }catch(e){} }
  if(!rank) rank = {};
  let precoAtual = 30;
  if(rank[pos]) precoAtual = rank[pos].preco;
  const precoPraPagar = Number((precoAtual * 1.3).toFixed(2));
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
  const pref = new Preference(client);
  const result = await pref.create({
    body: {
      items: [{ title: `Posicao #${pos} - ${categoria}`, quantity: 1, unit_price: precoPraPagar }],
      metadata: { pos: String(pos), nome, url, valor: String(precoPraPagar), cat: categoria },
      notification_url: `https://${req.headers.host}/api/webhook`,
      back_urls: { success: `https://${req.headers.host}?cat=${categoria}` }
    }
  });
  res.json({ url: result.init_point, preco: precoPraPagar });
}
