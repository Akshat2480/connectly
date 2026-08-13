const sharp = require("sharp");
const User = require("../models/userModel");
const Post = require("../models/postModel");
const factory = require("./factoryController");

const upload = require("../utils/upload");
const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");
const cloudinary = require("../utils/cloudinary");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const AsyncCatch = require("../utils/AsyncCatch");
const APIFeatures = require("../utils/apiFeatures");
const logger = require("../utils/logger");
const { invalidatePrefix } = require("../utils/cache");
const { imageQueue } = require("../queues/imageQueue");

const filterObject = (obj, allowedField) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedField.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const userController = {
  getMe: (req, res, next) => {
    req.params.id = req.user.id;
    next();
  },

  uploadUserPhoto: upload.single("photo"),

  updateMe: asyncCatch(async (req, res, next) => {
    if (req.body.password || req.body.passwordConfirm) {
      return next(
        new AppError(
          "You cannot update your password using this endpoint",
          404,
        ),
      );
    }
    const filterBody = filterObject(req.body, ["name"]);

    updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { ...filterBody, photoStatus: req.file ? "processing" : "done" },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (req.file)
      await imageQueue.add("resize-and-upload-user", {
        userId: updatedUser._id.toString(),
        buffer: req.file.buffer.toString("base64"),
      });

    res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });

    await invalidatePrefix(["users", `user:${req.user.id}`]);
  }),

  deleteMe: asyncCatch(async (req, res, next) => {
    const { password } = req.body;
    const user = await User.findById(req.user.id).select("+password");

    if (!user || !(await user.correctPassword(password)))
      return next(new AppError("Invalid credentials", 401));

    user.active = false;
    await user.save({ validateBeforeSave: false });

    res.status(204).send();

    await invalidatePrefix(["users", `user:${req.user.id}`]);
  }),

  getUser: asyncCatch(async (req, res, next) => {
    const user = await User.findById(req.params.id)
      .populate({
        path: "following",
        select: "name photo",
      })
      .populate({
        path: "followers",
        select: "name photo",
      });

    if (!user) return next(new AppError("No user found with given id", 404));

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  }),

  followUser: asyncCatch(async (req, res, next) => {
    if (req.params.id === req.user.id) {
      return next(new AppError("You cannot follow yourself", 400));
    }

    const targetExists = await User.findById(req.params.id);
    if (!targetExists)
      return next(new AppError("No user found with given id", 404));

    const currUser = await User.findById(req.user.id);
    const isFollowing = currUser.following.some(
      (id) => id.toString() === req.params.id,
    );

    if (isFollowing) {
      await User.updateOne(
        { _id: currUser.id },
        { $pull: { following: req.params.id } },
      );
    } else {
      await User.updateOne(
        { _id: currUser.id },
        { $addToSet: { following: req.params.id } },
      );
    }

    res.status(200).json({
      status: "success",
      following: !isFollowing,
    });

    await invalidatePrefix([
      "users",
      `user:${req.params.id}`,
      `user:${req.user.id}`,
    ]);
  }),

  getFeed: AsyncCatch(async (req, res, next) => {
    const authorIds = [...req.user.following, req.user.id];

    const feedQuery = Post.find({ author: { $in: authorIds } });
    const features = new APIFeatures(feedQuery.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const matchedFilter = features.query.getFilter();

    const [posts, totalResults] = await Promise.all([
      features.query,
      User.countDocuments(matchedFilter),
    ]);

    const page = features.page;
    const limit = features.limit;
    const totalPages = Math.ceil(totalResults / limit);

    res.status(200).json({
      status: "success",
      results: posts.length,
      pagination: {
        page,
        limit,
        totalResults,
        totalPages,
      },
      feed: {
        posts,
      },
    });
  }),

  searchUsersByName: AsyncCatch(async (req, res, next) => {
    const { name } = req.query;
    if (!name)
      return next(
        new AppError(
          "Enter the name of the user you are searching for...",
          400,
        ),
      );

    const users = await User.find({ name: { $regex: name, $options: "i" } });
    if (users.length === 0)
      return next(new AppError("No user found with given name", 400));

    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  }),
};

module.exports = userController;
