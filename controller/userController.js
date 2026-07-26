const multer = require("multer");
const sharp = require("sharp");

const factory = require("./factoryController");
const User = require("../models/userModel");
const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");

const filterObject = (obj, allowedField) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedField.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) cb(null, true);
  else cb(new AppError("The file type must be a image", 400), false);
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

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
    const filterBody = filterObject(req.body, ["name", "photo"]);

    const updatedUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
      returnDocument: "after",
    });
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
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    req.body.photo = req.file.filename;
    await sharp(req.file.buffer)
      .resize(500, 500)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`public/img/users/${req.file.filename}`);
    next();
  }),
};

module.exports = userController;
