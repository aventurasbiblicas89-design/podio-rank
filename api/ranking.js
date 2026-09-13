import { kv } from '@vercel/kv';

function tempoRelativo(timestamp) {
  const dias = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (dias === 0) return 'algumas horas';
  if (dias === 1) return '1 dia';
  return `${dias} dias`;
}

export default async function handler(req, res) {
  try {
    const { categoria = 'marketing', periodo = 'all' } = req.query;
    const chave = `ranking:${categoria}`;
    let itens = (await kv.get(chave)) || [];

    if (periodo === 'today') {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      itens = itens.filter(i => i.pagoEm >= inicioHoje.getTime());
    }

    const itensFormatados = itens.map(i => ({
      nome: i.nome,
      link: i.link,
      valor: i.valor,
      cliques: i.cliques || 0,
      tempoRelativo: tempoRelativo(i.pagoEm),
    }));

    return res.status(200).json({ itens: itensFormatados });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ itens: [] });
  }
}
