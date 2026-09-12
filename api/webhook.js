import { Redis } from '@upstash/redis';
import Stripe from 'stripe';
import { buffer } from 'micro';

const redis = Redis.fromEnv();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ESSENCIAL: desativa o bodyParser da Vercel
export const config = { api: { bodyParser: false } };

const CATEGORIAS = ['marketing','advogados','medicos','dentistas','clinicas','academias','empresarios','infoprodutos','sites','youtube','x','instagram','tiktok'];

export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  if(!sig) return res.status(400).send('Sem assinatura');

  let event;
  try{
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  }catch(e){
    console.error('Webhook signature fail:', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }

  if(event.type==='checkout.session.completed'){
    const s = event.data.object;
    
    // Idempotência - se Stripe mandar 2x, não reseta clicks
    const already = await redis.get(`processed:${s.id}`);
    if(already) return res.json({received:true, duplicate:true});
    
    let { cat, position, nome, url, preco } = s.metadata;
    
    cat = String(cat||'marketing').toLowerCase().slice(0,30);
    if(!CATEGORIAS.includes(cat)) cat='marketing';
    
    const pos = parseInt(position);
    if(isNaN(pos) || pos < 1 || pos > 100) return res.json({received:true});

    // Sanitiza de novo (defesa em profundidade)
    nome = String(nome||'').slice(0,80).replace(/[<>"']/g,'').trim();
    url = String(url||'').slice(0,300).trim();
    try{
      const u = new URL(url.startsWith('http')?url:'https://'+url);
      if(!['http:','https:'].includes(u.protocol)) throw new Error();
      url = u.toString();
    }catch{ url='#'; }

    let rank = await redis.get(`ranking:${cat}`);
    if(typeof rank==='string'){ try{ rank=JSON.parse(rank); }catch{ rank=null; } }
    if(!rank) rank = {};

    // Só atualiza se posição existe e não foi tomada por outra venda no mesmo segundo
    rank[pos] = { 
      preco: Number(Number(preco).toFixed(2)), 
      nome, 
      url, 
      clicks: rank[pos]?.clicks || 0, // mantém clicks se for "tomar"
      since: new Date().toISOString(),
      stripeSession: s.id
    };
    
    await redis.set(`ranking:${cat}`, JSON.stringify(rank));
    await redis.set(`processed:${s.id}`, '1', {ex: 86400*7}); // guarda 7 dias

    // EXPANSÃO AUTOMÁTICA
    let maxPos = Math.max(...Object.keys(rank).map(k=>parseInt(k)).filter(n=>!isNaN(n)));
    if(rank[maxPos]?.nome && maxPos < 100){
      let lastPrice = rank[maxPos].preco;
      let p1 = Number((lastPrice/1.3).toFixed(2)); if(p1<9.90) p1=9.90;
      let p2 = Number((p1/1.3).toFixed(2)); if(p2<9.90) p2=9.90;
      if(!rank[maxPos+1]) rank[maxPos+1] = { preco:p1, nome:null, url:null, clicks:0 };
      if(!rank[maxPos+2]) rank[maxPos+2] = { preco:p2, nome:null, url:null, clicks:0 };
      await redis.set(`ranking:${cat}`, JSON.stringify(rank));
    }
  }
  res.json({received:true});
}

