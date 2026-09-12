export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({erro:'POST only'});
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(500).json({erro:'SEM TOKEN'});
  try {
    const body = req.body || {};
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ title: 'Lance Podio Rank', quantity: 1, unit_price: Number(body.valor)||274.33, currency_id: 'BRL' }],
        back_urls: { success: 'https://www.podiorank.com.br/', failure: 'https://www.podiorank.com.br/', pending: 'https://www.podiorank.com.br/' },
        external_reference: body.url || 'podio'
      })
    });
    const data = await r.json();
    return res.json({url: data.init_point || data.sandbox_init_point, raw: data});
  } catch(e){ return res.status(500).json({erro:e.message}); }
}
