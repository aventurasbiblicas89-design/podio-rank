import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();
export default async function handler(req,res){
  let rank = await redis.get('ranking:marketing');
  if(typeof rank==='string') rank=JSON.parse(rank);
  rank[10].nome = "PEDRO HENRIQUE";
  rank[10].url = "https://youtube.com/@meme-zinho?si=VnRDBaijlDCtGv0e";
  rank[10].clicks = 0;
  await redis.set('ranking:marketing', JSON.stringify(rank));
  res.json({ok:true, link: rank[10].url});
}
