module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { Redis } = require('@upstash/redis');
    const redis = Redis.fromEnv();
    const stats = await redis.get('podio:stats') || { total: 0 };
    return res.status(200).json(stats);
  } catch (e) {
    return res.status(200).json({ total: 0 });
  }
};
