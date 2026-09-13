import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const chaveAdmin = req.headers['x-admin-key'];
  if (chaveAdmin !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Não autorizado' });

  try {
    const { acao, categoria, item, diasAtras, receita, produtos } = req.body;

    if (acao === 'limpar') {
      await kv.set(`ranking:${categoria}`, []);
      const todas = (await kv.get('ranking:todas')) || [];
      const filtrado = todas.filter(i => i.categoria !== categoria);
      await kv.set('ranking:todas', filtrado);
      return res.status(200).json({ ok: true });
    }

    if (acao === 'adicionar') {
      const entrada = {
        nome: item.nome,
        link: item.link,
        descricao: item.descricao || '',
        valor: Number(item.valor),
        categoria,
        cliques: Number(item.cliques) || 0,
        pagoEm: Date.now() - (Number(diasAtras) || 0) * 86400000,
      };

      const chave = `ranking:${categoria}`;
      const lista = (await kv.get(chave)) || [];
      lista.push(entrada);
      lista.sort((a, b) => b.valor - a.valor);
      await kv.set(chave, lista);

      const todas = (await kv.get('ranking:todas')) || [];
      todas.push(entrada);
      todas.sort((a, b) => b.valor - a.valor);
      await kv.set('ranking:todas', todas);

      return res.status(200).json({ ok: true, entrada });
    }

    if (acao === 'ajustarStats') {
      const stats = { receita: Number(receita) || 0, produtos: Number(produtos) || 0 };
      await kv.set('stats', stats);
      return res.status(200).json({ ok: true, stats });
    }

    return res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
