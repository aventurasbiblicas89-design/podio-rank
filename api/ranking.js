import { kv } from '@vercel/kv';

function tempoRelativo(timestamp) {
  const dias = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (dias === 0) return 'algumas horas';
  if (dias === 1) return '1 dia';
  return `${dias} dias`;
}

function extrairDominio(link) {
  try { return new URL(link).hostname.replace(/^www\./, ''); }
  catch { return link; }
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

    itens = [...itens].sort((a, b) => b.valor - a.valor);

    const itensFormatados = itens.map(i => ({
      id: i.pagoEm,
      nome: i.nome,
      link: i.link,
      descricao: i.descricao || '',
      dominio: extrairDominio(i.link),
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
