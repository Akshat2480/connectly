const { validationResult } = require("express-validator");
const AppError = require("./AppError");
const logger = require("./logger");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  logger.debug("Validation failed", { errors: errors.array() });
  const structuredErrors = errors.array().map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  next(new AppError("Validation failed", 400, structuredErrors));
};

module.exports = validate;
