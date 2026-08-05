const express = require("express");
const commentController = require("../controller/commentController");
const authController = require("../controller/authController");
const { cacheMiddleware, invalidateOnFinish } = require("../utils/cache");

const {
  createCommentValidator,
  getCommentValidator,
  deleteCommentValidator,
} = require("../validators/commentValidator");
const validate = require("../utils/validate");

const router = express.Router({ mergeParams: true });

router.get("/", cacheMiddleware("comments"), commentController.getComments);
router.post(
  "/",
  authController.protect,
  createCommentValidator,
  validate,
  commentController.createComment,
);

router
  .route("/:id")
  .get(
    getCommentValidator,
    validate,
    cacheMiddleware("comments:id"),
    commentController.getComment,
  )
  .delete(
    authController.protect,
    deleteCommentValidator,
    validate,
    invalidateOnFinish("comments"),
    commentController.deleteComment,
  );

module.exports = router;
