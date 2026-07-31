const { body, query } = require("express-validator");
const { mongoId } = require("./commonValidator");

exports.getUserValidator = [mongoId()];

exports.followUserValidator = [mongoId()];

exports.updateMeValidator = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
];

exports.searchUserValidator = [
  query("name")
    .trim()
    .notEmpty()
    .withMessage("Please provide a name to search"),
];

exports.deleteMeValidator = [
  body("password").notEmpty().withMessage("Password is required"),
];
