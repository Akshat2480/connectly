const jwt = require("jsonwebtoken");
const expressSession = require("express-session");

const User = require("../models/userModel");
const AsyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: `${process.env.JWT_EXPIRES_IN}`,
  });
};
const sendCookieWithToken = (user, res, statusCode, message) => {
  const token = signToken(user.id);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("jwt", token, cookieOptions);

  res.status(statusCode).json({ message, token });
};

const authController = {
  register: AsyncCatch(async (req, res, next) => {
    const { name, email, password, passwordConfirm } = req.body;

    // 1) Create a new user
    const newUser = await User.create({
      name,
      email,
      password,
      passwordConfirm,
    });
    // 2) Generate a JWT token and send it as cookie
    sendCookieWithToken(newUser, res, 201, "Sign up successful");
  }),

  login: AsyncCatch(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password)
      return next(
        new AppError("You must enter both email and password while logging in"),
      );

    // 1) Find the user by email
    const user = await User.findOne({ email }).select("+password");

    // Chcek if user exists and password is correct
    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate a JWT token
    sendCookieWithToken(user, res, 200, "Login successfull");
  }),

  protect: AsyncCatch(async (req, res, next) => {
    // Get token from request
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else token = req.cookies.jwt;

    if (!token) {
      return next(
        new AppError("You are not logged in! Please log in to get access", 401),
      );
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the user exists
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(
        new AppError(
          "The user belonging to this token does no longer exist",
          401,
        ),
      );
    }

    // Check if the password was changed after token was issued
    if (req.user.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          "User recently changed password, please log in again",
          401,
        ),
      );
    }

    // Grant access to protected route
    next();
  }),
};

module.exports = authController;
