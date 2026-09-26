// api/click.js
// Registra 1 clique em um produto/plataforma e redireciona pro link de afiliado.
// Reaproveita o banco Upstash Redis (upstash-kv-bistre-helmet) já conectado no projeto.
//
// Uso no site: <a href="/api/click?id=organizador-gavetas&plat=shopee&url=SEU_LINK_AFILIADO">Ver oferta</a>

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv(); // usa UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN já configuradas na Vercel

export default async function handler(req, res) {
  const { id, plat, url } = req.query;

  if (!id || !url) {
    return res.status(400).json({ error: 'faltam parâmetros: id e url são obrigatórios' });
  }

  const platform = plat || 'desconhecida';
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    await Promise.all([
      redis.incr(`clicks:total:${id}`),
      redis.incr(`clicks:by-platform:${id}:${platform}`),
      redis.incr(`clicks:by-day:${today}`),
      redis.zincrby('clicks:ranking', 1, id), // ranking de produtos mais clicados
    ]);
  } catch (err) {
    console.error('Erro ao registrar clique:', err);
    // mesmo se o tracking falhar, não trava a compra do usuário
  }

  // redireciona o comprador direto pro link de afiliado (Shopee / TikTok Shop / Mercado Livre)
  res.writeHead(302, { Location: decodeURIComponent(url) });
  res.end();
}

