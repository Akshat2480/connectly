const Post = require("../models/postModel");
const factory = require("./factoryController");

const upload = require("../utils/upload");
const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");
const { invalidatePrefix } = require("../utils/cache");
const { imageQueue } = require("../queues/imageQueue");

const filterObject = (obj, allowedField) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedField.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const postController = {
  getPosts: factory.getAll(Post),
  getPost: factory.getOne(Post),
  updatePost: factory.updateOne(Post, ["content"]),
  deletePost: factory.deleteOne(Post),

  uploadPostImages: upload.array("images", 5),

  createPost: asyncCatch(async (req, res, next) => {
    const filteredBody = filterObject(req.body, ["content"]);
    filteredBody.author = req.user.id;

    const files = req.files || [];

    const post = await Post.create({
      ...filteredBody,
      imageStatus: files.length ? "processing" : "done",
      expectedImageCount: files.length,
    });

    if (files.length) {
      const jobs = req.files.map((file, index) => ({
        name: "resize-and-upload",
        data: {
          postId: post._id.toString(),
          index,
          buffer: file.buffer.toString("base64"),
        },
      }));

      await imageQueue.addBulk(jobs);
    }

    res.status(201).json({ post });
  }),

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

    await invalidatePrefix(["posts", `post:${req.params.id}`]);
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
