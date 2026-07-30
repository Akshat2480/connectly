const AppError = require("../utils/AppError");

const sendErrorDev = (err, req, res) => {
  const response = {
    status: err.status,
    message: err.message,
    err,
  };
  console.log(err.errors);
  if (err.errors !== null) response.errors = err.errors;

  res.status(err.statusCode).json(response);
  console.log(err);
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Programming or unknown error: don't leak details
  console.error("ERROR 💥", err);
  return res.status(500).json({
    status: "error",
    message: "Something went very wrong...",
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
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
