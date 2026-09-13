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
    const { categoria = 'marketing', periodo = 'all', page = '1' } = req.query;
    const pagina = Math.max(1, parseInt(page) || 1);
    const tamanhoPagina = 50;

    const chave = `ranking:${categoria}`;
    let itens = (await kv.get(chave)) || [];

    if (periodo === 'today') {
      const inicioHoje = new Date();
      inicioHoje.setHours(0, 0, 0, 0);
      itens = itens.filter(i => i.pagoEm >= inicioHoje.getTime());
    }

    itens = [...itens].sort((a, b) => b.valor - a.valor);

    const total = itens.length;
    const totalPaginas = Math.max(1, Math.ceil(total / tamanhoPagina));
    const inicio = (pagina - 1) * tamanhoPagina;
    const itensPagina = itens.slice(inicio, inicio + tamanhoPagina);

    const itensFormatados = itensPagina.map(i => ({
      id: i.pagoEm,
      nome: i.nome,
      link: i.link,
      descricao: i.descricao || '',
      dominio: extrairDominio(i.link),
      categoria: i.categoria || categoria,
      valor: i.valor,
      cliques: i.cliques || 0,
      tempoRelativo: tempoRelativo(i.pagoEm),
    }));

    return res.status(200).json({ itens: itensFormatados, total, page: pagina, totalPaginas });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ itens: [], total: 0, page: 1, totalPaginas: 1 });
  }
}
