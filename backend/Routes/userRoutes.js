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
const rateLimiting = require("../utils/rateLimiting");

const router = express.Router();

router.post(
  "/register",
  rateLimiting({
    windowSeconds: 900,
    max: 5,
    prefix: "auth",
  }),
  registerValidator,
  validate,
  authController.register,
);
router.post(
  "/login",
  rateLimiting({
    windowSeconds: 900,
    max: 5,
    prefix: "auth",
  }),
  loginValidator,
  validate,
  authController.login,
);
router.post("/logout", authController.protect, authController.logout);
router.post(
  "/forgotPassword",
  rateLimiting({
    windowSeconds: 600,
    max: 10,
    prefix: "auth",
  }),
  forgotPasswordValidator,
  validate,
  authController.forgotPassword,
);
router.post(
  "/resetPassword/:resetToken",
  rateLimiting({
    windowSeconds: 600,
    max: 10,
    prefix: "auth",
  }),
  resetPasswordValidator,
  validate,
  authController.resetPassword,
);

router.get(
  "/me",
  authController.protect,
  cacheMiddleware((req) => `user:${req.user.id}`),
  userController.getMe,
  userController.getUser,
);
router.patch(
  "/me",
  authController.protect,
  userController.uploadUserPhoto,
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
