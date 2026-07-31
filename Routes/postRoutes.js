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
  searchPostValidator,
} = require("../validators/postValidator");
const validate = require("../utils/validate");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(postController.getPosts)
  .post(
    authController.protect,
    postController.uploadPostImages,
    postController.resizePostImages,
    postController.uploadPostsToCloudinary,
    createPostValidator,
    validate,
    postController.createPost,
  );

router.get(
  "/searchByContent",
  authController.protect,
  searchPostValidator,
  validate,
  postController.searchPostByContent,
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
