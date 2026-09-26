// api/click-stats.js
// Retorna o ranking dos produtos mais clicados, pra você ver o que mais converte.
// Uso: GET /api/click-stats  (protegido pela mesma ADMIN_SECRET do admin.js)

import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'não autorizado' });
  }

  try {
    // top 20 produtos por clique (do maior pro menor)
    const ranking = await redis.zrange('clicks:ranking', 0, 19, {
      rev: true,
      withScores: true,
    });

    // transforma [id, score, id, score, ...] em lista de objetos
    const produtos = [];
    for (let i = 0; i < ranking.length; i += 2) {
      produtos.push({ id: ranking[i], cliques: Number(ranking[i + 1]) });
    }

    res.status(200).json({ ranking: produtos });
  } catch (err) {
    console.error('Erro ao buscar stats de clique:', err);
    res.status(500).json({ error: 'erro ao buscar estatísticas' });
  }
}
