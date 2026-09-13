export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  
  try {
    const { posicao, valor, link } = req.body;
    
    // PEGA O VALOR REAL QUE CLICOU - 29.90 ou 274.33
    const preco = parseFloat(valor) || 29.90;
    
    if (!link) return res.status(400).json({error: 'Link obrigatório'});

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          title: `Pódio - ${posicao}`,
          quantity: 1,
          unit_price: preco,
          currency_id: 'BRL'
        }],
        back_urls: {
          success: 'https://podio-rank.vercel.app/sucesso',
          failure: 'https://podio-rank.vercel.app/erro',
          pending: 'https://podio-rank.vercel.app/erro'
        },
        auto_return: 'approved',
        notification_url: 'https://podio-rank.vercel.app/api/webhook',
        metadata: {
          posicao: posicao,
          link: link,
          valor: preco
        }
      })
    });

    const data = await response.json();
    
    if (data.init_point) {
      return res.json({ url: data.init_point, init_point: data.init_point });
    } else {
      console.log('Erro MP:', data);
      return res.status(400).json(data);
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
