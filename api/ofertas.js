const crypto = require('crypto');

const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql';
const KEYWORDS = ['organizador cozinha', 'gadget cozinha', 'produto limpeza casa', 'organizador casa'];
const DESCONTO_MINIMO = 20;
const MAX_OFERTAS = 60;

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body: JSON.stringify(cmd),
  });
  return r.json();
}

async function buscar(keyword) {
  const appId = process.env.SHOPEE_APP_ID;
  const secret = process.env.SHOPEE_SECRET;
  const query = `{ productOfferV2(keyword: ${JSON.stringify(keyword)}, sortType: 2, page: 1, limit: 30) {
    nodes { itemId productName price priceMin priceMax priceDiscountRate imageUrl shopName ratingStar sales offerLink productLink } } }`;
  const payload = JSON.stringify({ query });
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHash('sha256').update(appId + ts + payload + secret).digest('hex');
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${sig}`,
    },
    body: payload,
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return (j.data && j.data.productOfferV2 && j.data.productOfferV2.nodes) || [];
}

async function rodarRobo(req, res) {
  const auth = req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
  const manual = req.query && req.query.key === process.env.CRON_SECRET;
  if (!process.env.CRON_SECRET || (!auth && !manual)) return res.status(401).json({ erro: 'não autorizado' });
  try {
    const vistos = new Map();
    for (const kw of KEYWORDS) {
      const itens = await buscar(kw);
      for (const p of itens) {
        const desconto = Number(p.priceDiscountRate || 0);
        if (desconto < DESCONTO_MINIMO || !p.offerLink) continue;
        vistos.set(p.itemId, {
          id: p.itemId,
          nome: p.productName,
          preco: p.priceMin || p.price,
          desconto,
          imagem: p.imageUrl,
          loja: p.shopName,
          nota: p.ratingStar,
          vendas: p.sales,
          link: p.offerLink,
        });
      }
    }
    const lista = [...vistos.values()].sort((a, b) => b.desconto - a.desconto).slice(0, MAX_OFERTAS);
    await redis(['SET', 'ofertas:lista', JSON.stringify({ atualizadoEm: new Date().toISOString(), lista })]);
    res.status(200).json({ ok: true, total: lista.length });
  } catch (e) {
    res.status(500).json({ erro: String(e.message || e) });
  }
}

module.exports = async function handler(req, res) {
  if (req.query && req.query.acao === 'robo') return rodarRobo(req, res);
  try {
    const j = await redis(['GET', 'ofertas:lista']);
    const dados = j.result ? JSON.parse(j.result) : { atualizadoEm: null, lista: [] };
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(dados);
  } catch (e) {
    res.status(500).json({ atualizadoEm: null, lista: [] });
  }
};
