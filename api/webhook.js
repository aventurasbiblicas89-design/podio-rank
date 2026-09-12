import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req,res){
  const sig = req.headers['stripe-signature'];
  let event;
  try{ event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); }catch(e){ return res.status(400).send(`Webhook Error: ${e.message}`); }

  if(event.type==='checkout.session.completed'){
    const s = event.data.object;
    const { cat, position, nome, url, preco } = s.metadata;
    let rank = await redis.get(`ranking:${cat}`);
    if(typeof rank==='string') rank=JSON.parse(rank);

    rank[position] = { preco: Number(preco), nome, url, clicks: 0, since: new Date().toISOString() };
    await redis.set(`ranking:${cat}`, JSON.stringify(rank));

    // EXPANSÃO AUTOMÁTICA: se ocupou a última, cria 2 novas baratas
    let maxPos = Math.max(...Object.keys(rank).map(k=>parseInt(k)));
    if(rank[maxPos]?.nome && maxPos < 100){
      let lastPrice = rank[maxPos].preco;
      let p1 = Number((lastPrice/1.3).toFixed(2)); if(p1<9.90) p1=9.90;
      let p2 = Number((p1/1.3).toFixed(2)); if(p2<9.90) p2=9.90;
      rank[maxPos+1] = { preco:p1, nome:null, url:null, clicks:0 };
      rank[maxPos+2] = { preco:p2, nome:null, url:null, clicks:0 };
      await redis.set(`ranking:${cat}`, JSON.stringify(rank));
    }
  }
  res.json({received:true});
}

