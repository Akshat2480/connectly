const { param, query } = require("express-validator");

exports.mongoId = (name = "id") =>
  param(name).isMongoId().withMessage(`Invalid ${name}`);
