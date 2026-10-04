import fs from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

// Preços em reais. Se mudar, mude também no index.html.
const produtos = {
  pt: { titulo: 'E-book Deus Está Conosco (Português)', preco: 14.9 },
  es: { titulo: 'E-book Dios Está con Nosotros (Español)', preco: 14.9 },
  'livro-pt': { titulo: 'E-book animado Guarda o Teu Coração (Português)', preco: 19.9 },
  'livro-es': { titulo: 'E-book animado Guarda tu Corazón (Español)', preco: 19.9 },
  'livro-en': { titulo: 'Animated e-book Guard Your Heart (English)', preco: 19.9 },
};

const SITE = 'https://www.podiorank.com.br';
const pagamento = (id) =>
  fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
  }).then((r) => r.json());
const idioma = (ref) => (ref.endsWith('-es') ? 'es' : ref.endsWith('-en') ? 'en' : 'pt');
const ehNosso = (ref) => ref.startsWith('ebook-') || ref.startsWith('livro-');

const emails = {
  pt: ['Seu e-book está pronto', 'Obrigado pela compra! Acesse seu e-book aqui:', 'Abrir e-book'],
  es: ['Tu e-book está listo', '¡Gracias por tu compra! Accede a tu e-book aquí:', 'Abrir e-book'],
  en: ['Your e-book is ready', 'Thank you for your purchase! Open your e-book here:', 'Open e-book'],
};

export default async function handler(req, res) {
  const acao = req.query.acao;

  // 1) Criar o pagamento no Mercado Pago
  if (acao === 'checkout') {
    if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
    try {
      const id = produtos[req.body?.id] ? req.body.id : 'pt';
      const p = produtos[id];
      const ref = id.startsWith('livro-') ? id : `ebook-${id}`;
      const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ title: p.titulo, quantity: 1, unit_price: p.preco, currency_id: 'BRL' }],
          external_reference: ref,
          back_urls: { success: `${SITE}/obrigado.html`, pending: `${SITE}/obrigado.html`, failure: `${SITE}/` },
          auto_return: 'approved',
          notification_url: `${SITE}/api/ebook?acao=webhook`,
          statement_descriptor: 'EBOOK DEUS CONOSCO',
        }),
      });
      const d = await r.json();
      if (!d.init_point) return res.status(500).json({ erro: 'Falha ao criar pagamento' });
      return res.status(200).json({ url: d.init_point });
    } catch (e) {
      return res.status(500).json({ erro: 'Erro interno' });
    }
  }

  // 2) Entregar o arquivo (só com pagamento aprovado): PDF ou livro animado
  if (acao === 'download') {
    const pid = String(req.query.payment_id || '').replace(/\D/g, '');
    if (!pid) return res.status(400).send('Pagamento não informado.');
    try {
      const pay = await pagamento(pid);
      const ref = String(pay.external_reference || '');
      if (pay.status !== 'approved' || !ehNosso(ref))
        return res.status(402).send('Pagamento ainda não aprovado.');
      const lang = idioma(ref);
      if (ref.startsWith('livro-')) {
        const arq = path.join(process.cwd(), 'api', '_private', `livro-coracao-${lang}.html`);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'private, no-store');
        return res.status(200).send(fs.readFileSync(arq));
      }
      const arquivo = path.join(process.cwd(), 'api', '_private', `ebook-${lang}.pdf`);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${lang === 'es' ? 'Dios-Esta-Con-Nosotros' : 'Deus-Esta-Conosco'}.pdf"`);
      return res.status(200).send(fs.readFileSync(arquivo));
    } catch (e) {
      return res.status(500).send('Erro ao entregar o arquivo.');
    }
  }

  // 3) Aviso do Mercado Pago: manda o e-mail com o link
  if (acao === 'webhook') {
    try {
      const pid = req.body?.data?.id || req.query['data.id'] || req.query.id;
      if (!pid) return res.status(200).end();
      const pay = await pagamento(pid);
      const ref = String(pay.external_reference || '');
      const email = pay.payer?.email;
      if (pay.status === 'approved' && ehNosso(ref) && email && process.env.RESEND_API_KEY) {
        let novo = 1;
        try { novo = await kv.sadd('ebook_enviados', String(pay.id)); } catch (e) {}
        if (novo === 1) {
          try { await kv.incr('ebook:vendas'); } catch (e) {}
          const [assunto, texto, botao] = emails[idioma(ref)];
          const link = `${SITE}/obrigado.html?payment_id=${pay.id}`;
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'Deus Está Conosco <contato@podiorank.com.br>',
              to: [email],
              subject: assunto,
              html: `<p>${texto}</p><p><a href="${link}">${botao}</a></p>`,
            }),
          });
        }
      }
    } catch (e) {}
    return res.status(200).end();
  }

  // 4) Visitantes do dia (únicos, horário de São Paulo)
  if (acao === 'visita' || acao === 'visitas') {
    try {
      const dia = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const chave = `visitas:${dia}`;
      if (acao === 'visita') {
        const vid = String(req.query.vid || '').slice(0, 40);
        if (vid) { await kv.sadd(chave, vid); await kv.expire(chave, 60 * 60 * 24 * 3); }
      }
      const n = await kv.scard(chave);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ n });
    } catch (e) {
      return res.status(200).json({});
    }
  }

  return res.status(404).end();
        }
