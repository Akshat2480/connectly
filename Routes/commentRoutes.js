const express = require("express");
const commentController = require("../controller/commentController");

const router = express.Router();

router
  .route("/")
  .get(commentController.getComments)
  .post(commentController.createComment);
router
  .route("/:id")
  .get(commentController.getComment)
  .patch(commentController.updateComment)
  .delete(commentController.deleteComment);

module.exports = router;
