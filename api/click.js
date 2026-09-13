import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { categoria, id } = req.body;
    if (!categoria || !id) return res.status(400).json({ error: 'categoria e id obrigatórios' });

    const chave = `ranking:${categoria}`;
    const lista = (await kv.get(chave)) || [];
    const item = lista.find(i => i.pagoEm === id);
    if (item) {
      item.cliques = (item.cliques || 0) + 1;
      await kv.set(chave, lista);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(200).json({ ok: false });
  }
}
