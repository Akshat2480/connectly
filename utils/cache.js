const redisClient = require("./redisClient");
const logger = require("./logger");

const cacheMiddleware = (keyBuilder, ttlSeconds = 60) => {
  return async (req, res, next) => {
    // const key = `${prefix}:${req.originalUrl}`;
    const key = typeof keyBuilder === "function" ? keyBuilder(req) : keyBuilder;

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

const invalidatePrefix = async (keyBuilder) => {
  const keys = await redisClient.keys(keyBuilder);
  if (keys.length) await redisClient.del(...keys);
};

const invalidateOnFinish = (keyBuilder) => {
  return (req, res, next) => {
    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let prefix =
          typeof keyBuilder === "function" ? keyBuilder(req) : keyBuilder;
        invalidatePrefix(prefix);
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
