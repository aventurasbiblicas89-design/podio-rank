import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN nao configurado' });
  }

  try {
    const body = req.body || {};
    const { title, price, name, url } = body;

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [{
          id: '1',
          title: title || name || 'PodioRank TOP 10',
          quantity: 1,
          unit_price: Number(price) || 29.9,
          currency_id: 'BRL'
        }],
        metadata: { buyer_name: name || '', buyer_url: url || '' },
        back_urls: {
          success: 'https://www.podiorank.com.br/sucesso.html',
          failure: 'https://www.podiorank.com.br/erro.html',
          pending: 'https://www.podiorank.com.br/pendente.html'
        },
        auto_return: 'approved'
      }
    });

    return res.status(200).json({ init_point: result.init_point, id: result.id });

  } catch (e) {
    console.log('ERRO MP:', e);
    return res.status(500).json({ error: e.message });
  }
}
