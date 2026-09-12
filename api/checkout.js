export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({erro: 'Method not allowed'})
  
  const { link, valor } = req.body
  if (!link) return res.status(400).json({erro: 'SEM LINK'})

  const token = process.env.MP_ACCESS_TOKEN
  if (!token) return res.status(500).json({erro: 'SEM TOKEN - configura na Vercel'})

  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{
          title: `Top 1 - Pódio Rank - ${link}`,
          quantity: 1,
          unit_price: Number(valor) || 274.33,
          currency_id: 'BRL'
        }],
        back_urls: {
          success: 'https://www.podiorank.com.br/sucesso',
          failure: 'https://www.podiorank.com.br/erro',
          pending: 'https://www.podiorank.com.br/pendente'
        },
        auto_return: 'approved'
      })
    })
    
    const data = await mpRes.json()
    if (!mpRes.ok) return res.status(500).json({erro: 'MP ERRO', detalhe: data})
    
    return res.status(200).json({ url: data.init_point })
  } catch (e) {
    return res.status(500).json({erro: 'Erro checkout', detalhe: e.message})
  }
      }
