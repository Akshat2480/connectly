const factory = require("./factoryController");
const Post = require("../models/postModel");
const Comment = require("../models/commentModel");
const AsyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");
const { invalidatePrefix } = require("../utils/cache");

const commentController = {
  getComments: factory.getAll(Comment),
  getComment: factory.getOne(Comment),

  createComment: AsyncCatch(async (req, res, next) => {
    const postId = req.params.postId;

    const post = await Post.findById(postId);
    if (!post) return next(new AppError("No post found with given id", 404));

    let parentComment = null;
    if (req.body.parentComment) {
      parentComment = await Comment.findById(req.body.parentComment);
      if (!parentComment)
        return next(new AppError("Parent comment not found", 404));
      if (parentComment.post.toString() !== postId)
        return next(
          new AppError("Parent comment doesnot belong to the same post", 400),
        );
    }

    if (parentComment !== null && parentComment?.parentComment !== null)
      return next(new AppError("You cannot reply to another reply", 400));

    const comment = await Comment.create({
      text: req.body.text,
      post: postId,
      author: req.user.id,
      parentComment: parentComment?.id || null,
    });

    res.status(201).json({
      status: "success",
      data: {
        comment,
      },
    });

    await invalidatePrefix([
      "posts",
      `post:${req.params.postId}`,
      `comments:post:${req.params.postId}`,
    ]);
  }),

  deleteComment: AsyncCatch(async (req, res, next) => {
    const comment = await Comment.findById(req.params.id);

    if (!comment)
      return next(new AppError("No document found with the given id", 404));

    await Comment.findByIdAndDelete(req.params.id);

    res.status(204).send();

    await invalidatePrefix([
      "posts",
      `post:${comment.post}`,
      `comment:${req.params.id}`,
      `comments:post:${comment.post}`,
    ]);
  }),
};

module.exports = commentController;
