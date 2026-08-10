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

const worker = new Worker(
  "image-processing",
  async (job) => {
    await connectDB();
    const { postId, buffer } = job.data;

    const resized = await sharp(Buffer.from(buffer, "base64"))
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .toFormat("jpeg")
      .jpeg({ quality: 85 })
      .toBuffer();

    const uploaded = await uploadToCloudinary(resized, "connectly/posts");

    const posts = await Post.findByIdAndUpdate(postId, {
      $push: {
        images: {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
        },
      },
      $inc: { processedImageCount: 1 },
    });

    const post = await Post.findById(postId);
    if (post.processedImageCount === post.expectedImageCount) {
      await Post.findByIdAndUpdate(postId, { imageStatus: "done" });
    }
  },
  { connection: queueConnection, concurrency: 5 },
);

worker.on("completed", (job) => {
  logger.info(`Image job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed: ${err.message}`);
});

worker.on("error", (err) => {
  logger.error(`Worker error: ${err.message}`);
});

worker.on("ready", () => {
  logger.info("Image worker is ready");
});
