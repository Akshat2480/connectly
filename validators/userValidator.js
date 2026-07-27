const { body } = require("express-validator");
const { mongoId } = require("./commonValidator");

exports.getUserValidator = [mongoId()];

exports.followUserValidator = [mongoId()];

exports.updateMeValidator = [
  body("name").optional().trim().isLength({ min: 3, max: 50 }),

  body("email")
    .optional()
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage("Please provide a valid email"),
];
