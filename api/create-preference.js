import { MercadoPagoConfig, Preference } from 'mercadopago';
export default async function handler(req, res){
  if(req.method!== 'POST') return res.status(405).json({error:'method'});
  try{
    const {pos, preco, nome, url} = req.body;
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);
    const result = await preference.create({
      body:{
        items:[{ title:`Posicao #${pos}`, quantity:1, unit_price:Number(preco)}],
        metadata:{ pos:String(pos), nome, url },
        back_urls:{ success: 'https://podio-rank.vercel.app', failure: 'https://podio-rank.vercel.app' },
        auto_return:'approved',
        notification_url: 'https://podio-rank.vercel.app/api/webhook'
      }
    });
    return res.json({ init_point: result.init_point });
  }catch(e){ return res.status(500).json({error:e.message}); }
}
