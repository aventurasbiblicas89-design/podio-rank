import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  try {
    const { categoria, id } = req.query;
    if (!categoria || !id) return res.status(400).json({ error: 'categoria e id obrigatórios' });

    const chave = `ranking:${categoria}`;
    const lista = (await kv.get(chave)) || [];
    const ordenada = [...lista].sort((a, b) => b.valor - a.valor);
    const posicao = ordenada.findIndex(i => i.pagoEm === Number(id));

    if (posicao === -1) return res.status(404).json({ error: 'Não encontrado' });

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ posicao: posicao + 1, nome: ordenada[posicao].nome, valor: ordenada[posicao].valor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
