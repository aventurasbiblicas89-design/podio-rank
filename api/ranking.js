module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { Redis } = require('@upstash/redis');
    const redis = Redis.fromEnv();
    const data = await redis.get('podio:ranking') || [];
    return res.status(200).json(data);
  } catch (e) {
    return res.status(200).json([]);
  }
};
