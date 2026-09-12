import { Redis } from '@upstash/redis';
import Stripe from 'stripe';
const redis = Redis.fromEnv();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CATEGORIAS_VALIDAS = ['marketing','advogados','medicos','dentistas','clinicas','academias','empresarios','infoprodutos','sites','youtube','x','instagram','tiktok'];
const MAX_LEN_NOME = 80;
const MAX_LEN_URL = 300;

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).end();
  
  // Rate limit simples por IP
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const keyRate = `ratelimit:checkout:${ip}`;
  const count = await redis.incr(keyRate);
  if(count===1) await redis.expire(keyRate, 60);
  if(count>10) return res.status(429).json({error:'Muitas tentativas. Aguarde 1 min.'});

  let { cat, position, nome, url, email } = req.body;
  
  // Validação forte
  const category = (cat||'marketing').toLowerCase();
  if(!CATEGORIAS_VALIDAS.includes(category)) return res.status(400).json({error:'Categoria inválida'});
  
  const pos = parseInt(position);
  if(isNaN(pos) || pos < 1 || pos > 12) return res.status(400).json({error:'Posição inválida'});

  if(!nome || !url || !email) return res.status(400).json({error:'Nome, url e email obrigatórios'});
  nome = String(nome).trim().slice(0, MAX_LEN_NOME).replace(/[<>"']/g,'');
  url = String(url).trim().slice(0, MAX_LEN_URL);
  
  // URL tem que ser http/https e válida
  try{
    const u = new URL(url.startsWith('http')?url:'https://'+url);
    if(!['http:','https:'].includes(u.protocol)) throw new Error();
    url = u.toString();
  }catch{ return res.status(400).json({error:'URL inválida'}); }

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:'Email inválido'});

  let rank = await redis.get(`ranking:${category}`);
  if(typeof rank==='string') rank=JSON.parse(rank);
  if(!rank||!rank[pos]) return res.status(400).json({error:'Posição não existe'});

  const slot = rank[pos];
  let precoFinal = slot.nome? Number((slot.preco*1.3).toFixed(2)) : Number(slot.preco);
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
    line_items:[{price_data:{currency:'brl',product_data:{name:`${tipo.toUpperCase()} #${pos} - ${category}`.slice(0,100)},unit_amount:Math.round(precoFinal*100)},quantity:1}],
    mode:'payment',
    success_url:`${process.env.NEXT_PUBLIC_URL}/sucesso?cat=${category}&pos=${pos}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`${process.env.NEXT_PUBLIC_URL}/?cat=${category}`,
    customer_email:email,
    metadata:{cat:category,position:String(pos),nome,url,tipo,preco:String(precoFinal)}
  });
  res.json({url:session.url});
}
