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

    const now = Date.now();
    const windowStart = Date.now() - windowSeconds * 1000;

    await redisClient.zremrangebyscore(key, 0, windowStart);

    const count = await redisClient.zcard(key);

    if (count >= max) {
      const ttl = await redisClient.ttl(key);
      res.set("Retry-After", String(ttl));
      return res.status(429).json({
        message: "Too many requests! Please try again later",
      });
    }

    await redisClient.zadd(key, Date.now(), crypto.randomUUID());
    await redisClient.expire(key, windowSeconds);

    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(max - count));
    return next();
  });

module.exports = rateLimiting;
