const crypto = require("crypto");
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
    const requestId = crypto.randomUUID();

    const [allowed, count] = await redisClient.eval(
      `
        local key = KEYS[1]

        local now = tonumber(ARGV[1])
        local windowMs = tonumber(ARGV[2])
        local maxRequests = tonumber(ARGV[3])
        local requestId = ARGV[4]

        local windowStart = now - windowMs

        redis.call("ZREMRANGEBYSCORE", key, 0, windowStart)

        local count = redis.call("ZCARD", key)

        if count >= maxRequests then 
          return {0, count}
        end
        
        redis.call("ZADD", key, now, requestId)

        redis.call("EXPIRE", key, math.ceil(windowMs / 1000))
        
        return {1, count + 1}
      `,
      1,
      key,
      now,
      windowSeconds * 1000,
      max,
      requestId,
    );

    if (!allowed) {
      const ttl = await redisClient.ttl(key);
      res.set("Retry-After", String(ttl));
      return res.status(429).json({
        message: "Too many requests! Please try again later",
      });
    }

    res.set({
      "X-RateLimit-Limit": String(max),
      "X-RateLimit-Remaining": String(max - count),
    });

    next();
  });

module.exports = rateLimiting;
