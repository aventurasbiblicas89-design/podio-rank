export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  try {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) {
      return res.status(200).json({ erro: 'Token MP_ACCESS_TOKEN não encontrado na Vercel' });
    }

    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer ' + token, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        items: [{ title: 'Podio Rank #1', quantity: 1, unit_price: 274.33, currency_id: 'BRL' }],
        back_urls: { 
          success: 'https://www.podiorank.com.br/', 
          failure: 'https://www.podiorank.com.br/', 
          pending: 'https://www.podiorank.com.br/' 
        },
        auto_return: 'approved'
      })
    });

    const data = await r.json();
    
    if (!data.init_point) {
      return res.status(200).json({ erro: 'MP recusou', detalhe: data });
    }

    return res.status(200).json({ url: data.init_point });

  } catch (e) {
    return res.status(200).json({ erro: 'Erro checkout: ' + e.message });
  }
}
