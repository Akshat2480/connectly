require("dotenv").config();

const { Worker } = require("bullmq");
const { queueConnection } = require("../config/redisConnection");

const sharp = require("sharp");
const User = require("../models/userModel");
const Post = require("../models/postModel");
const cloudinary = require("../utils/cloudinary");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const logger = require("../utils/logger");

require("../config/db")();

const resolveStatusIfCompleted = async (postId) => {
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
    if (job.name === "resize-and-upload-post") {
      const { postId, index, buffer } = job.data;

      const resized = await sharp(Buffer.from(buffer, "base64"))
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .toFormat("jpeg")
        .jpeg({ quality: 85 })
        .toBuffer();

      const uploaded = await uploadToCloudinary(resized, "connectly/posts");

      await Post.findByIdAndUpdate(postId, {
        $set: {
          [`images.${index}`]: {
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
          },
        },
        $inc: { processedImageCount: 1 },
      });

      await resolveStatusIfCompleted(postId);
    }

    if (job.name === "resize-and-upload-user") {
      const { userId, buffer } = job.data;

      const resized = await sharp(Buffer.from(buffer, "base64"))
        .resize(500, 500)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toBuffer();

      const uploaded = await uploadToCloudinary(resized, "connectly/users");

      const user = await User.findById(userId).select("+photoPublicId");

      const updatedUser = await User.findByIdAndUpdate(userId, {
        photoStatus: "done",
        photo: uploaded.secure_url,
        photoPublicId: uploaded.public_id,
      });

      if (user.photoPublicId) {
        await cloudinary.uploader.destroy(user.photoPublicId);
      }
    }
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

  if (job.name === "resize-and-upload-post") {
    const maxAttempts = job?.opts?.attempts ?? 1;
    if (!job?.data?.postId || job.attemptsMade < maxAttempts) return;

    await Post.findByIdAndUpdate(job.data.postId, {
      $inc: { failedImageCount: 1 },
    });
    await resolveStatusIfCompleted(job.data.postId);
  }

  if (job.name === "resize-and-upload-user") {
    const maxAttempts = job?.opts?.attempts ?? 1;

    if (!job?.data?.userId || job.attemptsMade < maxAttempts) return;

    await User.findByIdAndUpdate(job.data.userId, {
      photoStatus: "failed",
    });
  }
});

worker.on("error", (err) => {
  logger.error(`Worker error: ${err.message}`);
});
