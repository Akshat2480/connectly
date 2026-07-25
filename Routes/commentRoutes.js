const express = require("express");
const commentController = require("../controller/commentController");
const authController = require("../controller/authController");

const router = express.Router({ mergeParams: true });

router.get('/', commentController.getComments)
router.post("/", authController.protect, commentController.createComment);

router
  .route("/:id")
  .get(commentController.getComment)
  .delete(authController.protect, commentController.deleteComment);

module.exports = router;
