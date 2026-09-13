import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const stats = (await kv.get('stats')) || { receita: 0, produtos: 0 };
    const visitantes = await kv.scard('visitantes_unicos');

    return res.status(200).json({
      visitantes,
      receita: Number(stats.receita || 0).toFixed(2).replace('.', ','),
      produtos: stats.produtos || 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ visitantes: 0, receita: '0,00', produtos: 0 });
  }
}
