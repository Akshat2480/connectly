const express = require("express");
const postController = require("../controller/postController");
const authController = require("../controller/authController");

const router = express.Router();

router
  .route("/")
  .get(postController.getPosts)
  .post(authController.protect, postController.createPost);
  
router.patch("/:id/like", authController.protect, postController.likePost);

router
  .route("/:id")
  .get(postController.getPost)
  .patch(authController.protect, postController.updatePost)
  .delete(authController.protect, postController.deletePost);

module.exports = router;
