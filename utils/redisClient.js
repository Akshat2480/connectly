const Redis = require("ioredis");
const logger = require("./logger");

const redisClient = new Redis(
  process.env.REDIS_URL || "redis://localhost:6397",
);

redisClient.on("error", (err) => logger.error("Redis error: ", err));

module.exports = redisClient;
