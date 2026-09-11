import { kv } from '@vercel/kv';
import { MercadoPagoConfig, Payment } from 'mercadopago';
export default async function handler(req, res){
  const id = req.query.id || req.body?.data?.id;
  if(!id) return res.json({ok:true});
  try{
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);
    const pay = await payment.get({id});
    if(pay.status === 'approved'){
      let rank = await kv.get('ranking');
      const pos = pay.metadata?.pos;
      const nome = pay.metadata?.nome;
      const url = pay.metadata?.url;
      if(pos && nome){
        if(!rank) rank = {};
        rank[pos] = { n:nome, v:Number(pay.transaction_amount), url:url||'' };
        await kv.set('ranking', rank);
      }
    }
  }catch(e){ console.log(e); }
  return res.json({ok:true});
}
