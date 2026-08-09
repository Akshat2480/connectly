const AsyncCatch = require("./AsyncCatch");
const redisClient = require("./redisClient");
const logger = require("./logger");

const rateLimiting = ({
  windowSeconds = 10,
  max = 10,
  prefix = "global",
} = {}) =>
  AsyncCatch(async (req, res, next) => {
    const identifier = req.user?.id || req.ip;
    const key = `rl:${prefix}:${identifier}`;

    const count = await redisClient.incr(key);

    logger.info(count);

    if (count === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    const ttl = await redisClient.ttl(key);
    if (count <= max) {
      res.set("X-RateLimit-Limit", String(max));
      res.set("X-RateLimit-Remaining", String(max - count));
      return next();
    }

    res.set("Retry-After", String(ttl));
    return res.status(429).json({
      message: "Too many requests! Please try again later",
    });
  });

module.exports = rateLimiting;
