const express = require("express");
const userController = require("../controller/userController");
const authController = require("../controller/authController");
const postRouter = require("../Routes/postRoutes");

const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require("../validators/authValidator");
const {
  updateMeValidator,
  getUserValidator,
  followUserValidator,
  searchUserValidator,
  deleteMeValidator,
} = require("../validators/userValidator");
const validate = require("../utils/validate");
const { cacheMiddleware } = require("../utils/cache");

const router = express.Router();

router.post("/register", registerValidator, validate, authController.register);
router.post("/login", loginValidator, validate, authController.login);
router.post("/logout", authController.protect, authController.logout);
router.post(
  "/forgotPassword",
  forgotPasswordValidator,
  validate,
  authController.forgotPassword,
);
router.post(
  "/resetPassword/:resetToken",
  resetPasswordValidator,
  validate,
  authController.resetPassword,
);

router.get(
  "/me",
  authController.protect,
  userController.getMe,
  cacheMiddleware((req) => `user:${req.user.id}`),
  userController.getUser,
);
router.patch(
  "/me",
  authController.protect,
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  updateMeValidator,
  validate,
  userController.updateMe,
);
router.delete(
  "/me",
  authController.protect,
  deleteMeValidator,
  validate,
  userController.deleteMe,
);
router.get(
  "/searchByName",
  authController.protect,
  searchUserValidator,
  validate,
  cacheMiddleware((req) => `users:name:${req.query.name}`),
  userController.searchUsersByName,
);

router.get(
  "/feed",
  authController.protect,
  cacheMiddleware((req) => `user:${req.user.id}:feed`),
  userController.getFeed,
);

router.patch(
  "/:id/follow",
  authController.protect,
  followUserValidator,
  validate,
  userController.followUser,
);
router.get(
  "/:id",
  getUserValidator,
  validate,
  cacheMiddleware((req) => `user:${req.params.id}`),
  userController.getUser,
);

router.use("/:userId/posts", postRouter);

module.exports = router;
