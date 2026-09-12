import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});

  try {
    // Aceita tanto pos/posicao e preco/valor
    const { pos, posicao, preco, valor, nome, url } = req.body;
    const posFinal = pos || posicao;
    const valorFinal = Number(preco || valor);

    if (!posFinal || !valorFinal || !nome || !url) {
      return res.status(400).json({error:'Dados faltando'});
    }

    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MP_ACCESS_TOKEN 
    });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [{
          title: `Posicao #${posFinal} - Podio Rank`,
          quantity: 1,
          unit_price: valorFinal,
          currency_id: 'BRL'
        }],
        metadata: { 
          pos: String(posFinal), 
          nome, 
          url, 
          valor: String(valorFinal) 
        },
        back_urls: {
          success: `https://podiorank.com.br?paid=${posFinal}`,
          failure: 'https://podiorank.com.br',
          pending: 'https://podiorank.com.br'
        },
        auto_return: 'approved',
        notification_url: 'https://podiorank.com.br/api/webhook'
      }
    });

    return res.status(200).json({ init_point: result.init_point });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
