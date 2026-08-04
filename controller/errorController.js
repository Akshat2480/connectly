const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

const sendErrorDev = (err, req, res) => {
  const response = {
    status: err.status,
    message: err.message,
    err,
  };
  if (err.errors) response.errors = err.errors;

  res.status(err.statusCode).json(response);
  logger.debug(err.message, { stack: err.stack });
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response = {
      status: err.status,
      message: err.message,
    };
    return res.status(err.statusCode).json(response);
  }

  // Programming or unknown error: don't leak details
  logger.error("Unhandled error", { message: err.message, stack: err.stack });
  return res.status(500).json({
    status: "error",
    message: "Something went very wrong...",
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    sendErrorDev(err, req, res);
  } else {
    let error = Object.assign({}, err);

    if (err.name === "JsonWebTokenError")
      error = new AppError("Invalid token, please log in again", 401);
    if (err.name === "TokenExpiredError")
      error = new AppError("Your token has expired, please log in again", 401);
    if (err.code === 11000) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        error = new AppError(`Already in use (${field} : ${value} )`, 400);
      }
    }

    sendErrorProd(error, req, res);
  }
};
