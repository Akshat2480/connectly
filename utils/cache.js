const redisClient = require("./redisClient");
const logger = require("./logger");

const cacheMiddleware = (prefix, ttlSeconds = 60) => {
  return async (req, res, next) => {
    const key = `${prefix}:${req.originalUrl}`;

    try {
      const cached = await redisClient.get(key);

      if (cached) {
        logger.info("Getting from cache");
        return res.status(200).json(JSON.parse(cached));
      }
    } catch (err) {
      logger.error("cache read failed : ", err);
    }

    const orignalJson = res.json.bind(res);
    res.json = (body) => {
      redisClient.setex(key, ttlSeconds, JSON.stringify(body)).catch((err) => {
        logger.error("Cache write failed : ", err);
      });
      return orignalJson(body);
    };

    next();
  };
};

exports.invalidatePrefix = async (prefix) => {
  const keys = await redisClient.keys(`${prefix}:*`);
  if (keys.length) await redisClient.del(...keys);
};

module.exports = cacheMiddleware;
