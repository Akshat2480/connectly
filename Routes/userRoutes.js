const express = require("express");
const userController = require("../controller/userController");
const authController = require("../controller/authController");
const postRouter = require("../Routes/postRoutes");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgotPassword", authController.forgotPassword);
router.post("/resetPassword/:resetToken", authController.resetPassword);

router.get(
  "/me",
  authController.protect,
  userController.getMe,
  userController.getUser,
);
router.patch(
  "/me",
  authController.protect,
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);

router.patch("/:id/follow", authController.protect, userController.followUser);
router.use("/:userId/posts", postRouter);
router.get("/:id", userController.getUser);

module.exports = router;
