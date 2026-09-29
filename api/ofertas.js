// api/ofertas.js — devolve as ofertas salvas para a página do site
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

module.exports = async function handler(req, res) {
  try {
    const r = await fetch(REDIS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      body: JSON.stringify(['GET', 'ofertas:lista']),
    });
    const j = await r.json();
    const dados = j.result ? JSON.parse(j.result) : { atualizadoEm: null, lista: [] };
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(dados);
  } catch (e) {
    res.status(500).json({ atualizadoEm: null, lista: [] });
  }
};
