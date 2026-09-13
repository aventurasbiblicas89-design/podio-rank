import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end();

  try {
    const paymentId = req.body?.data?.id;
    if (!paymentId) return res.status(200).end();

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const pagamento = await r.json();

    if (pagamento.status !== 'approved') return res.status(200).end();

    const { posicao, link, valor, nomeEmpresa, categoria } = pagamento.metadata;

    const chave = `ranking:${categoria}`;
    const lista = (await kv.get(chave)) || [];

    lista.push({
      nome: nomeEmpresa || 'Anônimo',
      link,
      valor: Number(valor),
      cliques: 0,
      pagoEm: Date.now(),
    });
    lista.sort((a, b) => b.valor - a.valor);
    await kv.set(chave, lista);

    const stats = (await kv.get('stats')) || { receita: 0, produtos: 0 };
    stats.receita += Number(valor);
    stats.produtos += 1;
    await kv.set('stats', stats);

    return res.status(200).end();
  } catch (err) {
    console.error(err);
    return res.status(200).end();
  }
}

