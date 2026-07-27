const express = require("express");
const postController = require("../controller/postController");
const authController = require("../controller/authController");
const commentRouter = require("../Routes/commentRoutes");
const {
  createPostValidator,
  updatePostValidator,
  deletePostValidator,
  getPostValidator,
  likePostValidator,
} = require("../validators/postValidator");
const validate = require("../utils/validate");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(postController.getPosts)
  .post(
    authController.protect,
    postController.uploadPostImage,
    postController.resizePostImages,
    createPostValidator,
    validate,
    postController.createPost,
  );

router.use("/:postId/comments", commentRouter);

router.patch(
  "/:id/like",
  authController.protect,
  likePostValidator,
  validate,
  postController.likePost,
);

router
  .route("/:id")
  .get(getPostValidator, validate, postController.getPost)
  .patch(
    authController.protect,
    updatePostValidator,
    validate,
    postController.updatePost,
  )
  .delete(
    authController.protect,
    deletePostValidator,
    validate,
    postController.deletePost,
  );

module.exports = router;
