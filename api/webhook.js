import { Redis } from '@upstash/redis';
import { MercadoPagoConfig, Payment } from 'mercadopago';

const redis = Redis.fromEnv();

export default async function handler(req, res){
  const id = req.query.id || req.body?.data?.id || req.query['data.id'];
  if(!id) return res.json({ok:true});

  try{
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);
    const pay = await payment.get({id});

    if(pay.status === 'approved'){
      let rank = await redis.get('ranking');
      if(typeof rank === 'string'){
        try{ rank=JSON.parse(rank); }catch(e){}
      }
      if(!rank) rank = {};

      const pos = pay.metadata?.pos;
      const nome = pay.metadata?.nome;
      const url = pay.metadata?.url;
      const valorPago = Number(pay.metadata?.valor || pay.transaction_amount);

      if(pos && nome && url && valorPago){
        rank[pos] = {
          preco: valorPago,
          nome: nome.toUpperCase(),
          url: url
        };
        await redis.set('ranking', JSON.stringify(rank));
        console.log(`Pos ${pos} tomada por ${nome} por ${valorPago}`);
      }
    }
  }catch(e){
    console.log('Webhook error', e.message);
  }

  return res.json({ok:true});
}

