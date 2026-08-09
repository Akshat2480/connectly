const AsyncCatch = require("./AsyncCatch");
const redisClient = require("./redisClient");
const logger = require("./logger");

const rateLimiting = (ttlSeconds = 600) =>
  AsyncCatch(async (req, res, next) => {
    if (await redisClient.get("count")) {
      await redisClient.incr("count");
    } else {
      await redisClient.setex("count", ttlSeconds, 1);
    }

    const count = await redisClient.get("count");
    if (count <= 10) {
      return next();
    } else {
      return res.status(429).json({
        message: "Too many requests",
      });
    }
  });

module.exports = rateLimiting;
