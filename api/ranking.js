import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req,res){
  const cat = (req.query.cat || 'marketing').toLowerCase();
  const page = parseInt(req.query.page || '1');
  const SLOTS_PER_PAGE = 10;
  const MAX_SLOTS = 100;

  let rank = await redis.get(`ranking:${cat}`);
  if(typeof rank === 'string'){ try{ rank=JSON.parse(rank); }catch(e){} }

  if(!rank || Object.keys(rank).length===0){
    rank = {};
    let preco = 19.90;
    for(let i=10; i>=1; i--){
      rank[i] = { preco: Number(preco.toFixed(2)), nome: null, url: null, clicks: 0 };
      preco = preco * 1.3;
    }
  }

  // === EXPANSÃO AUTOMÁTICA ===
  // Converte chaves pra número e acha o maior
  let maxPos = Math.max(...Object.keys(rank).map(k => parseInt(k)));
  let occupied = Object.values(rank).filter(r => r.nome!== null).length;

  // Se todos os slots atuais estão ocupados e ainda não chegou no máximo, cria mais 10
  if(occupied >= maxPos && maxPos < MAX_SLOTS){
    let lastPrice = rank[maxPos]?.preco || 19.90;
    // Próximos 10 são MAIS BARATOS que o último - pra gerar volume
    // Ex: #10 = 19.90, #11 = 15.30, #12 = 11.77...
    let preco = lastPrice / 1.3;
    for(let i = maxPos + 1; i <= Math.min(maxPos + 10, MAX_SLOTS); i++){
      rank[i] = { preco: Number(preco.toFixed(2)), nome: null, url: null, clicks: 0 };
      preco = preco / 1.3;
      if(preco < 9.90) preco = 9.90; // piso mínimo
    }
    maxPos = Math.max(...Object.keys(rank).map(k => parseInt(k)));
    await redis.set(`ranking:${cat}`, JSON.stringify(rank));
  }

  // === PAGINAÇÃO ===
  const totalBidders = Object.keys(rank).length;
  const totalOccupied = Object.values(rank).filter(r => r.nome!== null).length;
  const totalPages = Math.ceil(totalBidders / SLOTS_PER_PAGE);
  const start = (page - 1) * SLOTS_PER_PAGE + 1;
  const end = Math.min(start + SLOTS_PER_PAGE - 1, maxPos);

  // Retorna só a página pedida + info de expansão
  let pageData = {};
  for(let i = start; i <= end; i++){
    if(rank[i]) pageData[i] = rank[i];
  }

  res.json({
   ...pageData,
    _pagination: {
      currentPage: page,
      totalPages,
      totalBidders,
      totalOccupied,
      hasNextPage: maxPos > page * SLOTS_PER_PAGE,
      hasPrevPage: page > 1,
      maxPos
    }
  });
}
