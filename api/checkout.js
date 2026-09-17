export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  try {
    const { posicao, valor, link, nomeEmpresa, categoria, descricao, email } = req.body;
    const preco = parseFloat(valor) || 10;
    if (!link) return res.status(400).json({error: 'Link obrigatório'});
    if (!categoria) return res.status(400).json({error: 'Categoria obrigatória'});

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          title: `RankGospel - ${posicao} - ${nomeEmpresa || ''}`,
          quantity: 1,
          unit_price: preco,
          currency_id: 'BRL'
        }],
        back_urls: {
          success: 'https://www.rankgospel.com.br/sucesso',
          failure: 'https://www.rankgospel.com.br/erro',
          pending: 'https://www.rankgospel.com.br/erro'
        },
        auto_return: 'approved',
        notification_url: 'https://www.rankgospel.com.br/api/webhook',
        metadata: { posicao, link, valor: preco, nomeEmpresa, categoria, descricao: descricao || '', email: email || '' }
      })
    });
    const data = await response.json();
    if (data.init_point) return res.json({ url: data.init_point, init_point: data.init_point });
    else return res.status(400).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

