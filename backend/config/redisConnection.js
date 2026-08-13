const Redis = require("ioredis");

exports.redisClient = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
);

exports.queueConnection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);
