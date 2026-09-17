import { kv } from '@vercel/kv';

async function enviarEmailPosicaoPerdida(email, nome, categoria, posicaoAntiga, posicaoNova, valorNovoLance) {
  if (!email) return;

  const perdeuTopo = posicaoAntiga === 1;
  const subject = perdeuTopo
    ? 'Você foi superado no ranking! 🔥'
    : `Você caiu para a posição #${posicaoNova} no ranking`;

  const html = perdeuTopo
    ? `<p>Olá ${nome},</p>
       <p>Alguém acabou de pagar mais que você e tomou o #1 na categoria <strong>${categoria}</strong> (novo valor: R$ ${valorNovoLance.toFixed(2)}).</p>
       <p>Quer recuperar sua posição? Acesse <a href="https://www.podiorank.com.br">podiorank.com.br</a> e dê um novo lance.</p>`
    : `<p>Olá ${nome},</p>
       <p>Um novo lance de R$ ${valorNovoLance.toFixed(2)} na categoria <strong>${categoria}</strong> fez você cair
       da posição #${posicaoAntiga} para a posição #${posicaoNova}.</p>
       <p>Quer subir de novo? Acesse <a href="https://www.podiorank.com.br">podiorank.com.br</a> e dê um novo lance.</p>`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RankGospel <ranking@podiorank.com.br>',
        to: email,
        subject,
        html
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

    const { link, valor, nomeEmpresa, categoria, descricao, email, posicao } = pagamento.metadata;

    if (String(posicao).toUpperCase() === 'TAKEOVER') {
      const takeover = {
        nome: nomeEmpresa || 'Anônimo',
        link,
        descricao: descricao || '',
        valor: Number(valor),
        categoria: categoria || 'todas',
        pagoEm: Date.now(),
        expiraEm: Date.now() + 3 * 60 * 60 * 1000,
      };
      await kv.set('takeover:ativo', takeover);

      const statsT = (await kv.get('stats')) || { receita: 0, produtos: 0 };
      statsT.receita += Number(valor);
      statsT.produtos += 1;
      await kv.set('stats', statsT);

      await kv.sadd('pagamentos_processados', paymentId);
      return res.status(200).end();
    }

    const chave = `ranking:${categoria}`;
    const lista = (await kv.get(chave)) || [];

    const ordemAntiga = [...lista].sort((a, b) => b.valor - a.valor);
    const posicaoAntigaPorId = new Map(
      ordemAntiga.map((item, index) => [item.pagoEm, index + 1])
    );

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

    const posicaoNovaPorId = new Map(
      lista.map((item, index) => [item.pagoEm, index + 1])
    );

    for (const item of ordemAntiga) {
      if (!item.email) continue;
      const posicaoAntiga = posicaoAntigaPorId.get(item.pagoEm);
      const posicaoNova = posicaoNovaPorId.get(item.pagoEm);
      if (posicaoNova > posicaoAntiga) {
        await enviarEmailPosicaoPerdida(
          item.email,
          item.nome,
          categoria,
          posicaoAntiga,
          posicaoNova,
          entrada.valor
        );
      }
    }

    return res.status(200).end();
  } catch (err) {
    console.error(err);
    return res.status(200).end();
  }
  }


