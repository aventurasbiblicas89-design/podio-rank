export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).json({error: 'Method not allowed'});
  try {
    const { posicao, valor, link, nomeEmpresa } = req.body;
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
          title: `Pódio - ${posicao} - ${nomeEmpresa || ''}`,
          quantity: 1,
          unit_price: preco,
          currency_id: 'BRL'
        }],
        back_urls: {
          success: 'https://podiorank.com.br/sucesso',
          failure: 'https://podiorank.com.br/erro',
          pending: 'https://podiorank.com.br/erro'
        },
        auto_return: 'approved',
        notification_url: 'https://podiorank.com.br/api/webhook',
        metadata: { posicao, link, valor: preco, nomeEmpresa }
      })
    });
    const data = await response.json();
    if (data.init_point) return res.json({ url: data.init_point, init_point: data.init_point });
    else return res.status(400).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
