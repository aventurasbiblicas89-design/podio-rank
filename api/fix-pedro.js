import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  await redis.set('ranking:youtube', JSON.stringify({10:{nome:"PEDRO HENRIQUE / MEME-ZINHO",url:"https://youtube.com/@meme-zinho",preco:19.9,clicks:127}}));
  res.json({ok:true});
}
