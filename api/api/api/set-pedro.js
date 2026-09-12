import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  const rank = {
    "10": {"preco": 19.9, "nome": "PEDRO HENRIQUE", "url": "https://youtube.com/@meme-zinho?si=VnRDBaijlDCtGv0e", "clicks": 0},
    "9": {"preco": 25.87, "nome": null, "url": null, "clicks": 0},
    "8": {"preco": 33.63, "nome": null, "url": null, "clicks": 0},
    "7": {"preco": 43.72, "nome": null, "url": null, "clicks": 0},
    "6": {"preco": 56.83, "nome": null, "url": null, "clicks": 0},
    "5": {"preco": 73.88, "nome": null, "url": null, "clicks": 0},
    "4": {"preco": 96.05, "nome": null, "url": null, "clicks": 0},
    "3": {"preco": 124.86, "nome": null, "url": null, "clicks": 0},
    "2": {"preco": 162.32, "nome": null, "url": null, "clicks": 0},
    "1": {"preco": 211.02, "nome": null, "url": null, "clicks": 0}
  };
  await redis.set('ranking:marketing', JSON.stringify(rank));
  res.json({ ok: true, msg: 'PEDRO HENRIQUE no #10!' });
}
