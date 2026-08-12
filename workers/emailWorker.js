require("dotenv").config();

const { Worker } = require("bullmq");
const { queueConnection } = require("../config/redisConnection");

const { convert } = require("html-to-text");
const resetPasswordTemplate = require("../utils/templates/resetPasswordTemplate");
const welcomeTemplate = require("../utils/templates/welcomeTemplate");
const { sendEmail } = require("../utils/email");

const logger = require("../utils/logger");

require("../config/db")();

const worker = new Worker(
  "email-sending",
  async (job) => {
    if (job.name === "send-reset-email") {
      const { name, resetUrl } = job.data;

      const html = resetPasswordTemplate(name, resetUrl);
      await sendEmail({
        subject: "Your password reset link (Valid for 10min)",
        html,
        text: convert(html),
      });
    }

    if (job.name === "send-welcome-email") {
      const { name } = job.data;

      const html = welcomeTemplate(name);
      await sendEmail({
        subject: "Welcome to Connectly!",
        html,
        text: convert(html),
      });
    }
  },
  {
    connection: queueConnection,
    concurrency: 5,
  },
);

worker.on("ready", () => {
  logger.info("Email worker is ready");
});

worker.on("completed", (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  logger.error(`Job ${job.id} failed: ${err.message}`);
});

worker.on("error", (err) => {
  logger.error(`Worker error: ${err.message}`);
});
