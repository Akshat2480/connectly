const { body } = require("express-validator");
const { mongoId } = require("./commonValidator");

exports.createPostValidator = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Post content is required")
    .isLength({ max: 500 })
    .withMessage("Post cannot exceed 500 characters"),
];

exports.updatePostValidator = [
  mongoId(),

  body("content")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Post cannot exceed 500 characters"),
];

exports.deletePostValidator = [mongoId()];

exports.getPostValidator = [mongoId()];

exports.likePostValidator = [mongoId()];
