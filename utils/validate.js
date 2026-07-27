const { validationResult } = require("express-validator");
const AppError = require("./AppError");

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) return next();

  let message = errors.errors.map((error) => `${error.path} : ${error.msg}`);

  next(new AppError(message, 400));
};

module.exports = validate;
