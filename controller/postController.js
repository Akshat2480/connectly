const fs = require("fs");
const sharp = require("sharp");
const Post = require("../models/postModel");
const factory = require("./factoryController");

const upload = require("../utils/upload");
const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const sendNotification = require("../utils/sendNotification");

const { invalidatePrefix } = require("../utils/cache");

const postController = {
  getPosts: factory.getAll(Post),
  getPost: factory.getOne(Post),
  createPost: factory.createOne(Post, ["content", "images"]),
  updatePost: factory.updateOne(Post, ["content"]),
  deletePost: factory.deleteOne(Post),

  likePost: asyncCatch(async (req, res, next) => {
    const post = await Post.findById(req.params.id);
    if (!post) return next(new AppError("No post found with given id", 404));

    const hasLiked = post.likes.some((id) => id.toString() === req.user.id);

    if (hasLiked) {
      await Post.updateOne(
        { _id: req.params.id },
        { $pull: { likes: req.user.id } },
      );
    } else {
      await Post.updateOne(
        { _id: req.params.id },
        { $addToSet: { likes: req.user.id } },
      );

      await sendNotification({
        recipient: post.author,
        sender: req.user.id,
        type: "like",
        post: post._id,
      });
    }

    res.status(200).json({
      status: "success",
      like: !hasLiked,
    });

    await invalidatePrefix(`post:${req.params.id}`);
  }),

  uploadPostImages: upload.array("images", 5),

  resizePostImages: asyncCatch(async (req, res, next) => {
    if (!req.files || req.files.length === 0) return next();

    await Promise.all(
      req.files.map(async (file) => {
        file.buffer = await sharp(file.buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .toFormat("jpeg")
          .jpeg({ quality: 85 })
          .toBuffer();
      }),
    );

    next();
  }),

  uploadPostsToCloudinary: asyncCatch(async (req, res, next) => {
    if (!req.files || req.files.length === 0) return next();

    const uploadedImages = await Promise.all(
      req.files.map(async (file) => {
        const uploaded = await uploadToCloudinary(
          file.buffer,
          "connectly/posts",
        );
        return {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
        };
      }),
    );

    req.body.images = uploadedImages;
    next();
  }),

  searchPostByContent: asyncCatch(async (req, res, next) => {
    const { content } = req.query;
    if (!content)
      return next(new AppError("Enter the content you are searching for..."));

    const posts = await Post.find({
      content: {
        $regex: content,
        $options: "i",
      },
    });
    if (posts.length === 0)
      return next(new AppError("No post found with such content", 400));

    res.status(200).json({
      status: "success",
      results: posts.length,
      data: {
        posts,
      },
    });
  }),
};

module.exports = postController;
