const { body, query } = require("express-validator");
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
  mongoId("id"),

  body("content")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Post content cannot be empty")
    .isLength({ max: 500 })
    .withMessage("Post cannot exceed 500 characters"),
];

exports.deletePostValidator = [mongoId()];

exports.getPostValidator = [mongoId()];

exports.likePostValidator = [mongoId()];

exports.searchPostValidator = [
  query("content")
    .trim()
    .notEmpty()
    .withMessage("Please provide content to search"),
];
