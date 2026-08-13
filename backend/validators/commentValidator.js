const { body } = require("express-validator");
const { mongoId } = require("./commonValidator");

exports.createCommentValidator = [
  mongoId("postId"),

  body("text")
    .trim()
    .notEmpty()
    .withMessage("Comment cannot be empty")
    .isLength({ max: 300 })
    .withMessage("Comment cannot exceed 300 characters"),

  body("parentComment")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Invalid parent comment id"),
];

exports.getCommentValidator = [mongoId()];

exports.deleteCommentValidator = [mongoId()];
