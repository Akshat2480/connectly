const { Queue } = require("bullmq");
const { queueConnection } = require("../config/redisConnection");

exports.imageQueue = new Queue("image-processing", {
  connection: queueConnection,
});
