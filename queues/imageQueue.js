const { Queue } = require("bullmq");
const { queueConnection } = require("../config/redisConnection");

exports.imageQueue = new Queue("image-processing", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});
