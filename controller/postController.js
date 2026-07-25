const factory = require("./factoryController");
const Post = require("../models/postModel");
const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");

const postController = {
  getPosts: factory.getAll(Post),
  getPost: factory.getOne(Post),
  createPost: factory.createOne(Post, ["content"]),
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
};

module.exports = postController;
