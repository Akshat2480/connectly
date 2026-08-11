const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("../config/db");
const { Worker } = require("bullmq");
const sharp = require("sharp");

require("../models/userModel");
const Post = require("../models/postModel");
const { queueConnection } = require("../config/redisConnection");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const logger = require("../utils/logger");

connectDB();

const resolveStatudIfCompleted = async (postId) => {
  const post = await Post.findById(postId);

  const totalResolved = post.processedImageCount + post.failedImageCount;
  if (totalResolved === post.expectedImageCount) {
    const status = post.processedImageCount === 0 ? "failed" : "partial";
    await Post.findByIdAndUpdate(postId, {
      imageStatus: post.failedImageCount === 0 ? "done" : status,
    });
  }
};

const worker = new Worker(
  "image-processing",
  async (job) => {
    const { postId, index, buffer } = job.data;

    const resized = await sharp(Buffer.from(buffer, "base64"))
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .toFormat("jpeg")
      .jpeg({ quality: 85 })
      .toBuffer();

    const uploaded = await uploadToCloudinary(resized, "connectly/posts");

    const posts = await Post.findByIdAndUpdate(postId, {
      $set: {
        [`images.${index}`]: {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
        },
      },
      $inc: { processedImageCount: 1 },
    });

    await resolveStatudIfCompleted(postId);
  },
  { connection: queueConnection, concurrency: 5 },
);

worker.on("ready", () => {
  logger.info("Image worker is ready");
});

worker.on("completed", (job) => {
  logger.info(`Image job ${job.id} completed`);
});

worker.on("failed", async (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);

  const maxAttempts = job?.opts?.attempts ?? 1;
  if (!job?.data?.postId || job.attemptsMade < maxAttempts) return;

  await Post.findByIdAndUpdate(job.data.postId, {
    $inc: { failedImageCount: 1 },
  });
  await resolveStatudIfCompleted(job.data.postId);
});

worker.on("error", (err) => {
  logger.error(`Worker error: ${err.message}`);
});
