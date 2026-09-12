import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req,res){
  if(req.method!== 'POST') return res.status(405).end();
  
  try {
    const { pos, nome, url, cat } = req.body;
    if(!pos || !nome || !url) {
      return res.status(400).json({ error: 'Faltando pos, nome ou url' });
    }
    
    const categoria = (cat || 'marketing').toLowerCase();
    let rank = await redis.get(`ranking:${categoria}`);
    if(typeof rank === 'string'){ try{ rank=JSON.parse(rank); }catch(e){} }
    if(!rank) rank = {};
    
    const precoBase = 19.90 * Math.pow(1.3, 10 - Number(pos));
    const atual = rank[pos]?.preco || precoBase;
    const novoPreco = Number((atual * 1.3).toFixed(2));

    // Garante https:// no link
    let linkFinal = url;
    if(!linkFinal.startsWith('http')) linkFinal = 'https://' + linkFinal;

    console.log('Criando pagamento MP:', {pos, nome, linkFinal, novoPreco, categoria});

    if(!process.env.MP_ACCESS_TOKEN){
      console.error('MP_ACCESS_TOKEN não configurado');
      return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado no Vercel' });
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        items: [{ 
          title: `Posicao #${pos} - ${categoria} - ${nome}`, 
          quantity: 1, 
          unit_price: novoPreco,
          currency_id: 'BRL'
        }],
        metadata: { pos: String(pos), nome, url: linkFinal, cat: categoria },
        back_urls: { 
          success: `https://podiorank.com.br/?cat=${categoria}`, 
          failure: `https://podiorank.com.br/?cat=${categoria}`,
          pending: `https://podiorank.com.br/?cat=${categoria}`
        },
        notification_url: `https://podiorank.com.br/api/webhook`,
        auto_return: 'approved'
      })
    });
    
    const data = await mpRes.json();
    
    if(!mpRes.ok){
      console.error('Erro Mercado Pago:', data);
      return res.status(500).json({ error: 'Erro MP', details: data });
    }

    // Retorna nos dois formatos pra compatibilidade
    res.json({ 
      url: data.init_point, 
      init_point: data.init_point, 
      price: novoPreco,
      id: data.id
    });

  } catch(err){
    console.error('Erro checkout:', err);
    res.status(500).json({ error: err.message });
  }
}
