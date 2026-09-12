import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { categoria, posicao, nome, link } = req.body;
    
    // Pega preço atual
    const raw = await redis.get(`ranking:${categoria}`);
    let ranking = typeof raw === 'string' ? JSON.parse(raw) : raw;
    let preco = ranking?.[posicao]?.preco;
    if (!preco) preco = posicao == 1 ? 95 : posicao <= 3 ? 65 : 35;

    const mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{ title: `Pódio #${posicao} - ${categoria}`, quantity: 1, unit_price: Number(preco), currency_id: 'BRL' }],
        back_urls: {
          success: 'https://www.podiorank.com.br/sucesso',
          failure: 'https://www.podiorank.com.br/erro',
          pending: 'https://www.podiorank.com.br/pendente'
        },
        auto_return: 'approved',
        external_reference: `${categoria}|${posicao}|${nome}|${link}`,
        notification_url: 'https://www.podiorank.com.br/api/webhook'
      })
    });

    const data = await mp.json();
    
    if (!data.init_point) {
      return res.status(500).json({ erro: 'Erro MP', detalhe: data });
    }

    return res.status(200).json({ url: data.init_point });

  } catch (e) {
    return res.status(500).json({ erro: e.message });
  }
}
