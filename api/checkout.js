import { Redis } from '@upstash/redis';
import Stripe from 'stripe';
const redis = Redis.fromEnv();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).end();
  const { cat, position, nome, url, email } = req.body;
  const category = (cat||'marketing').toLowerCase();
  const pos = parseInt(position);

  let rank = await redis.get(`ranking:${category}`);
  if(typeof rank==='string') rank=JSON.parse(rank);
  if(!rank||!rank[pos]) return res.status(400).json({error:'Posição não existe'});

  const slot = rank[pos];
  let precoFinal = slot.nome? Number((slot.preco*1.3).toFixed(2)) : slot.preco;
  let tipo = slot.nome? 'tomar' : 'ocupar';

  // TRAVA: só deixa comprar a LIVRE mais barata
  if(tipo==='ocupar'){
    const livres = Object.entries(rank).filter(([k,v])=>!v.nome).map(([k,v])=>({pos:parseInt(k),preco:v.preco})).sort((a,b)=>a.preco-b.preco);
    if(livres[0] && livres[0].pos!==pos){
      return res.status(400).json({error:`Posição #${pos} não é a mais barata. Compre a #${livres[0].pos} por R$ ${livres[0].preco}`, suggestedPos:livres[0].pos});
    }
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types:['card'],
    line_items:[{price_data:{currency:'brl',product_data:{name:`${tipo.toUpperCase()} #${pos} - ${category}`},unit_amount:Math.round(precoFinal*100)},quantity:1}],
    mode:'payment',
    success_url:`${process.env.NEXT_PUBLIC_URL||'https://podiorank.com.br'}/sucesso?cat=${category}&pos=${pos}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`${process.env.NEXT_PUBLIC_URL||'https://podiorank.com.br'}/?cat=${category}`,
    customer_email:email,
    metadata:{cat:category,position:String(pos),nome,url,tipo,preco:String(precoFinal)}
  });
  res.json({url:session.url});
            }
