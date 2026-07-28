const fs = require("fs");
const sharp = require("sharp");
const upload = require("../utils/upload");
const factory = require("./factoryController");
const Post = require("../models/postModel");
const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");

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
    }

    res.status(200).json({
      status: "success",
      like: !hasLiked,
    });
  }),

  uploadPostImage: upload.array("images", 5),

  resizePostImages: asyncCatch(async (req, res, next) => {
    if (!req.files || req.files.length === 0) return next();

    req.body.images = [];

    await Promise.all(
      req.files.map(async (file, i) => {
        const filename = `post-${req.user.id}-${Date.now()}-${i}.jpeg`;

        await sharp(file.buffer)
          .resize(1000, 1000, { fit: "inside" })
          .toFormat("jpeg")
          .jpeg({ quality: 90 })
          .toFile(`public/img/posts/${filename}`);

        req.body.images.push(filename);
      }),
    );

    next();
  }),
};

module.exports = postController;
