const factory = require("./factoryController");
const Post = require("../models/postModel");
const Comment = require("../models/commentModel");
const AsyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");
const sendNotification = require("../utils/sendNotification");

const commentController = {
  getComments: factory.getAll(Comment),
  getComment: factory.getOne(Comment),
  deleteComment: factory.deleteOne(Comment),

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

    if (parentComment !== null) {
      await sendNotification({
        recipient: parentComment.author,
        sender: req.user.id,
        type: "reply",
        post: postId,
      });
    } else {
      await sendNotification({
        recipient: post.author,
        sender: req.user.id,
        type: "comment",
        post: postId,
      });
    }

    res.status(201).json({
      status: "success",
      data: {
        comment,
      },
    });

    await invalidatePrefix("comments");
  }),
};

module.exports = commentController;
