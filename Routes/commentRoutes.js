const express = require("express");
const commentController = require("../controller/commentController");
const authController = require("../controller/authController");

const {
  createCommentValidator,
  getCommentValidator,
  deleteCommentValidator,
} = require("../validators/commentValidator");
const validate = require("../utils/validate");

const router = express.Router({ mergeParams: true });

router.get("/", commentController.getComments);
router.post(
  "/",
  authController.protect,
  createCommentValidator,
  validate,
  commentController.createComment,
);

router
  .route("/:id")
  .get(getCommentValidator, validate, commentController.getComment)
  .delete(
    authController.protect,
    deleteCommentValidator,
    validate,
    commentController.deleteComment,
  );

module.exports = router;
