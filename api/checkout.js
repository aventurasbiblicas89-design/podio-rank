import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const CATEGORIAS_VALIDAS = ['marketing','advogados','medicos','dentistas','clinicas','academias','empresarios','infoprodutos','sites','youtube','x','instagram','tiktok'];

function limpaNome(nome){
  return String(nome).trim()
 .replace(/\s*-\s*\d+K\b/gi,'')
 .replace(/\s*\d+K\b/gi,'')
 .replace(/[<>"']/g,'')
 .split(' - ')[0].trim()
 .slice(0,80);
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).end();

  let { cat, position, nome, url, email } = req.body;
  const category = (cat||'marketing').toLowerCase();
  const pos = parseInt(position);
  if(!CATEGORIAS_VALIDAS.includes(category)) return res.status(400).json({error:'Categoria inválida'});
  if(isNaN(pos) || pos < 1 || pos > 12) return res.status(400).json({error:'Posição inválida'});
  if(!nome ||!url ||!email) return res.status(400).json({error:'Dados obrigatórios'});

  nome = limpaNome(nome);

  let rank = await redis.get(`ranking:${category}`);
  if(typeof rank==='string') try{ rank=JSON.parse(rank); }catch{}
  if(!rank || Object.keys(rank).length===0){
    rank = {};
    for(let i=1;i<=12;i++) rank[i]={preco: i===1?95 : i<=3?65 : 35};
    await redis.set(`ranking:${category}`, JSON.stringify(rank));
  }

  const slot = rank[pos];
  let precoFinal = slot.nome? Number((slot.preco*1.3).toFixed(2)) : Number(slot.preco);
  let tipo = slot.nome? 'TOMAR' : 'OCUPAR';

  // Cria pagamento no Mercado Pago
  const pref = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      items: [{
        title: `${tipo} #${pos} - ${category}`.slice(0,100),
        quantity: 1,
        unit_price: Number(precoFinal),
        currency_id: 'BRL'
      }],
      payer: { email: email },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_URL}/sucesso?cat=${category}&pos=${pos}`,
        failure: `${process.env.NEXT_PUBLIC_URL}/?cat=${category}`,
        pending: `${process.env.NEXT_PUBLIC_URL}/?cat=${category}`
      },
      auto_return: 'approved',
      external_reference: `${category}|${pos}|${nome}|${url}|${email}|${tipo}|${precoFinal}`,
      metadata: { cat: category, position: String(pos), nome, url, tipo, preco: String(precoFinal) }
    })
  });

  const data = await pref.json();
  if(!pref.ok){
    console.log('ERRO MP:', data);
    return res.status(400).json({error: 'Erro MP: ' + JSON.stringify(data)});
  }

  return res.json({url: data.init_point});
                 }
