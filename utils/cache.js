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

const invalidatePrefix = async (prefixes) => {
  const prefixList = Array.isArray(prefixes) ? prefixes : [prefixes];

  await Promise.all(
    prefixList.map(async (prefix) => {
      const keys = await redisClient.keys(`${prefix}*`);
      if (keys.length) await redisClient.del(...keys);
    }),
  );
};

const invalidateOnFinish = (prefixes) => {
  return (req, res, next) => {
    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const prefixList = Array.isArray(prefixes) ? prefixes : [prefix];
        console.log(prefixList);

        await Promise.all(
          prefixList.map(async (rawPrefix) => {
            console.log(rawPrefix);
            let prefix =
              typeof rawPrefix === "function" ? rawPrefix(req) : rawPrefix;
            const keys = await redisClient.keys(`${prefix}*`);
            if (keys.length) await redisClient.del(...keys);
          }),
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
