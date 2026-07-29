const sharp = require("sharp");
const User = require("../models/userModel");
const factory = require("./factoryController");

const upload = require("../utils/upload");
const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");
const cloudinary = require("../utils/cloudinary");
const uploadToCloudinary = require("../utils/uploadToCloudinary");
const AsyncCatch = require("../utils/AsyncCatch");
const Post = require("../models/postModel");
const APIFeatures = require("../utils/apiFeatures");

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

    let currentUser;
    let uploadedImage;
    if (req.file) {
      currentUser = await User.findById(req.user.id).select("+photoPublicId");
      uploadedImage = await uploadToCloudinary(
        req.file.buffer,
        "connectly/users",
      );
      filterBody.photo = uploadedImage.secure_url;
      filterBody.photoPublicId = uploadedImage.public_id;
    }

    let updatedUser;
    try {
      updatedUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
        returnDocument: "after",
        runValidators: true,
      });
    } catch (err) {
      if (uploadedImage?.public_id) {
        await cloudinary.uploader.destroy(uploadedImage.public_id);
        return next(new AppError("There was a problem updating the user"));
      }
    }

    if (currentUser.photoPublicId)
      await cloudinary.uploader
        .destroy(currentUser.photoPublicId)
        .catch((err) => console.log("Failed to delete old profile image"));

    res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });
  }),

  deleteMe: asyncCatch(async (req, res, next) => {
    const { password } = req.body;
    const user = await User.findById(req.user.id).select("+password");

    if (!user || !(await user.correctPassword(password)))
      return next(new AppError("Invalid credentials", 401));

    user.active = false;
    await user.save({ validateBeforeSave: false });

    res.status(204).send();
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
      // UNFOLLOW
      await User.updateOne(
        { _id: currUser.id },
        { $pull: { following: req.params.id } },
      );
    } else {
      // FOLLOW
      await User.updateOne(
        { _id: currUser.id },
        { $addToSet: { following: req.params.id } },
      );
    }

    res.status(200).json({
      status: "success",
      following: !isFollowing,
    });
  }),

  uploadUserPhoto: upload.single("photo"),

  resizeUserPhoto: asyncCatch(async (req, res, next) => {
    if (!req.file) return next();

    req.file.butter = await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toBuffer();
    next();
  }),

  getFeed: AsyncCatch(async (req, res, next) => {
    const authorIds = [...req.user.following, req.user.id];

    const feedQuery = Post.find({ author: { $in: authorIds } });
    const features = new APIFeatures(feedQuery.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const posts = await features.query;

    res.status(200).json({
      status: "success",
      results: posts.length,
      feed: {
        posts,
      },
    });
  }),
};

module.exports = userController;
