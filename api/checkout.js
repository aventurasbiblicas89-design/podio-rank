export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const body = req.body || {};
    const link = body.link;
    
    if (!link) {
      return res.status(400).json({ erro: 'Cola um link!' });
    }

    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      return res.status(500).json({ erro: 'TOKEN MP_ACCESS_TOKEN NAO CONFIGURADO NA VERCEL' });
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{ title: 'Podio Rank - 30 dias no topo', quantity: 1, unit_price: 274.33, currency_id: 'BRL' }],
        back_urls: { 
          success: 'https://podiorank.com.br/sucesso', 
          failure: 'https://podiorank.com.br', 
          pending: 'https://podiorank.com.br' 
        },
        auto_return: 'approved'
      })
    });

    const data = await response.json();
    
    if (!data.init_point) {
      return res.status(500).json({ erro: 'Mercado Pago erro', detalhe: data });
    }

    return res.status(200).json({ url: data.init_point });

  } catch (err) {
    return res.status(500).json({ erro: 'Erro interno: ' + err.message });
  }
}
