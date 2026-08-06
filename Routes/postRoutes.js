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
const { cacheMiddleware, invalidateOnFinish } = require("../utils/cache");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(cacheMiddleware("posts"), postController.getPosts)
  .post(
    authController.protect,
    postController.uploadPostImages,
    postController.resizePostImages,
    postController.uploadPostsToCloudinary,
    createPostValidator,
    validate,
    invalidateOnFinish(["posts"]),
    postController.createPost,
  );

router.get(
  "/searchByContent",
  authController.protect,
  searchPostValidator,
  validate,
  cacheMiddleware((req) => `posts:content:${req.query.content}`),
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
  .get(
    getPostValidator,
    validate,
    cacheMiddleware((req) => `post:${req.params.id}`),
    postController.getPost,
  )
  .patch(
    authController.protect,
    updatePostValidator,
    validate,
    invalidateOnFinish(["posts", (req) => `post:${req.params.id}`]),
    invalidateOnFinish("posts"),
    postController.updatePost,
  )
  .delete(
    authController.protect,
    deletePostValidator,
    validate,
    invalidateOnFinish(["posts", (req) => `post:${req.params.id}`]),
    postController.deletePost,
  );

module.exports = router;
