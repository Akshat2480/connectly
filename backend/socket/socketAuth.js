const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const cookie = require("cookie");
const User = require("../models/userModel");
const AppError = require("../utils/AppError");
const AsyncCatch = require("../utils/AsyncCatch");

module.exports = AsyncCatch(async (socket, next) => {
  try {
    const rawCookie = socket.handshake.headers.cookie;
    if (!rawCookie) return next(new AppError("Not authenticated", 401));

    const { jwt: token } = cookie.parse(rawCookie);
    if (!token) return next(new AppError("Not authenticated", 401));

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new AppError("User no longer exists", 404));

    socket.user = user;
    next();
  } catch (err) {
    next(err);
  }
});
