import { kv } from '@vercel/kv';

async function enviarEmailSuperado(email, nomeAntigo, categoria, novoValor) {
  if (!email) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Podio Rank <onboarding@resend.dev>',
        to: email,
        subject: 'Você foi superado no ranking! 🔥',
        html: `<p>Olá ${nomeAntigo},</p><p>Alguém acabou de pagar mais que você e tomou o #1 na categoria <strong>${categoria}</strong> (novo valor: R$ ${novoValor.toFixed(2)}).</p><p>Quer recuperar sua posição? Acesse <a href="https://www.podiorank.com.br">podiorank.com.br</a> e dê um novo lance.</p>`
      })
    });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).end();
  try {
    const paymentId = req.body?.data?.id;
    if (!paymentId) return res.status(200).end();

    const jaProcessado = await kv.sismember('pagamentos_processados', paymentId);
    if (jaProcessado) return res.status(200).end();

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const pagamento = await r.json();

    if (pagamento.status !== 'approved') return res.status(200).end();

    const { link, valor, nomeEmpresa, categoria, descricao, email } = pagamento.metadata;

    const chave = `ranking:${categoria}`;
    const lista = (await kv.get(chave)) || [];

    const anteriorTop = lista.length > 0 ? [...lista].sort((a, b) => b.valor - a.valor)[0] : null;

    const entrada = {
      nome: nomeEmpresa || 'Anônimo',
      link,
      descricao: descricao || '',
      email: email || '',
      valor: Number(valor),
      categoria,
      cliques: 0,
      pagoEm: Date.now(),
    };

    lista.push(entrada);
    lista.sort((a, b) => b.valor - a.valor);
    await kv.set(chave, lista);

    const todas = (await kv.get('ranking:todas')) || [];
    todas.push(entrada);
    todas.sort((a, b) => b.valor - a.valor);
    await kv.set('ranking:todas', todas);

    const stats = (await kv.get('stats')) || { receita: 0, produtos: 0 };
    stats.receita += Number(valor);
    stats.produtos += 1;
    await kv.set('stats', stats);

    await kv.sadd('pagamentos_processados', paymentId);

    if (anteriorTop && entrada.valor > anteriorTop.valor && anteriorTop.email) {
      await enviarEmailSuperado(anteriorTop.email, anteriorTop.nome, categoria, entrada.valor);
    }

    return res.status(200).end();
  } catch (err) {
    console.error(err);
    return res.status(200).end();
  }
      }

