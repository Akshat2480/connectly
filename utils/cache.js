const redisClient = require("./redisClient");
const logger = require("./logger");

const cacheMiddleware = (prefix, ttlSeconds = 60) => {
  return async (req, res, next) => {
    const key = `${prefix}:${req.originalUrl}`;

    try {
      const cached = await redisClient.get(key);

      if (cached) {
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

const invalidatePrefix = async (prefix) => {
  const keys = await redisClient.keys(`${prefix}:*`);
  if (keys.length) await redisClient.del(...keys);
};

const invalidateOnFinish = (prefix) => {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidatePrefix(prefix).catch((err) =>
          logger.error(`There was a problem invalidating cache for ${prefix}`),
        );
      }
    });
    next();
  };
};

module.exports = {
  cacheMiddleware,
  invalidatePrefix,
  invalidateOnFinish,
};
