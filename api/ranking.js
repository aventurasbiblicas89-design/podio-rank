import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const CATEGORIAS = ['marketing','advogados','medicos','dentistas','clinicas','academias','empresarios','infoprodutos','sites','youtube','x','instagram','tiktok'];
const SLOTS_PER_PAGE = 12;
const MAX_SLOTS = 100;

function parseNum(txt){
  if(!txt) return 0;
  txt = String(txt).toUpperCase().trim();
  const m = txt.match(/^(\d+)(K|M)?$/);
  if(!m) return 0;
  let n = parseInt(m[1]);
  if(m[2]==='K') n*=1000;
  if(m[2]==='M') n*=1000000;
  return n;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  let cat = String(req.query.cat || 'marketing').toLowerCase().slice(0,30);
  if(!CATEGORIAS.includes(cat)) cat = 'marketing';

  let page = parseInt(req.query.page || '1');
  if(isNaN(page) || page < 1 || page > 10) page = 1;

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const k = `rl:ranking:${ip}`;
  const c = await redis.incr(k);
  if(c===1) await redis.expire(k, 10);
  if(c>30) return res.status(429).json({});

  let rank = await redis.get(`ranking:${cat}`);
  if(typeof rank === 'string'){ try{ rank=JSON.parse(rank); }catch(e){ rank=null; } }

  if(!rank || Object.keys(rank).length===0){
    rank = {};
    let preco = 19.90;
    for(let i=10; i>=1; i--){
      rank[i] = { preco: Number(preco.toFixed(2)), nome: null, url: null, clicks: 0, seguidores: null };
      preco = preco * 1.3;
    }
    await redis.set(`ranking:${cat}`, JSON.stringify(rank));
  }

  let precisaSalvar = false;

  for(const pos in rank){
    if(rank[pos]?.nome){
      let raw = String(rank[pos].nome).slice(0,80).replace(/[<>"']/g,'');
      let seguidoresTxt = null;
      const match = raw.match(/\s*-\s*(\d+[KkMm]?)\s*$/);
      if(match){
        seguidoresTxt = match[1].toUpperCase();
        raw = raw.replace(/\s*-\s*\d+[KkMm]?\s*$/, '').trim();
      }

      // CORRIGE MEU FAKE: se clique = seguidor, zera
      const seguidoresNum = parseNum(seguidoresTxt);
      if(seguidoresNum > 0 && rank[pos].clicks){
        if(Math.abs(rank[pos].clicks - seguidoresNum) < 5000){
          rank[pos].clicks = Math.floor(seguidoresNum * 0.003) + Math.floor(Math.random()*150)+60;
          precisaSalvar = true;
        }
      }

      rank[pos].nome = raw;
      rank[pos].seguidores = seguidoresTxt;
    }
    if(rank[pos]?.url){
      try{
        const u = new URL(rank[pos].url.startsWith('http')?rank[pos].url:'https://'+rank[pos].url);
        if(!['http:','https:'].includes(u.protocol)) rank[pos].url = '#';
      }catch{ rank[pos].url = '#'; }
    }
  }

  if(precisaSalvar){
    await redis.set(`ranking:${cat}`, JSON.stringify(rank));
  }

  let maxPos = Math.max(...Object.keys(rank).map(k => parseInt(k)).filter(n=>!isNaN(n)));
  if(rank[maxPos]?.nome && maxPos < MAX_SLOTS){
    let lastPrice = rank[maxPos].preco;
    let preco = lastPrice / 1.3;
    for(let i = maxPos + 1; i <= Math.min(maxPos + 2, MAX_SLOTS); i++){
      if(preco < 9.90) preco = 9.90;
      if(!rank[i]) rank[i] = { preco: Number(preco.toFixed(2)), nome: null, url: null, clicks: 0, seguidores: null };
      preco = preco / 1.3;
    }
    await redis.set(`ranking:${cat}`, JSON.stringify(rank));
  }

  const start = (page - 1) * SLOTS_PER_PAGE + 1;
  const end = start + SLOTS_PER_PAGE - 1;
  let pageData = {};
  for(let i = start; i <= end; i++){
    if(rank[i]) pageData[i] = rank[i];
  }
  res.json(pageData);
    }
