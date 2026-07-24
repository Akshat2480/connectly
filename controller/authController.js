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
sendCookieWithToken = (user, res) => {
  const token = signToken(user.id);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("jwt", token, cookieOptions);
};

const authController = {
  register: AsyncCatch(async (req, res, next) => {
    const { name, email, password, passwordConfirm } = req.body;

    // Create a new user
    const newUser = await User.create({
      name,
      email,
      password,
      passwordConfirm,
    });
    // Generate a JWT token and send it as cookie
    sendCookieWithToken(newUser, res);

    res.status(201).json({
      message: "Sign up successful",
    });
  }),

  login: AsyncCatch(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password)
      return next(
        new AppError("You must enter both email and password while logging in"),
      );

    // Find the user by email
    const user = await User.findOne({ email }).select("+password");

    // Chcek if user exists and password is correct
    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate a JWT token
    sendCookieWithToken(user, res);

    res.status(200).json({ message: "Login successful" });
  }),
};

module.exports = authController;
