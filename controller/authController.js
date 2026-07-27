const jwt = require("jsonwebtoken");
const { convert } = require("html-to-text");
const crypto = require("crypto");

const User = require("../models/userModel");
const AsyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");
const { sendEmail } = require("../utils/email");
const welcomeTemplate = require("../utils/templates/welcomeTemplate");
const resetPasswordTemplate = require("../utils/templates/resetPasswordTemplate");
const { promisify } = require("util");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: `${process.env.JWT_EXPIRES_IN}`,
  });
};
const sendCookieWithToken = (user, res) => {
  const token = signToken(user.id);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "none",
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    maxAge: process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
  };
  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
  res.cookie("jwt", token, cookieOptions);
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
    res.status(201).json({ message: "Signed up successful" });

    // 3) Send email to the user
    const html = welcomeTemplate(newUser.name);
    // await sendEmail({
    //   to: newUser.email,
    //   subject: "Welcome to Connectly!",
    //   html,
    //   text: convert(html),
    // }).catch((err) => {
    //   console.log(err);
    //   console.error("Unable to send email");
    // });
  }),

  login: AsyncCatch(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password)
      return next(
        new AppError("You must enter both email and password while logging in"),
      );

    // 1) Find the user by email
    const user = await User.findOne({ email }).select("+password");

    // 2) Chcek if user exists and password is correct
    if (!user || !(await user.correctPassword(password))) {
      return next(new AppError("Invalid credentials", 401));
    }

    // 3) Generate a JWT token and sent it as cookie
    sendCookieWithToken(user, res);
    res.status(200).json({ message: "Logged in successful" });
  }),

  protect: AsyncCatch(async (req, res, next) => {
    // 1) Get token from request
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

    // 2) Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) Check if the user exists
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return next(
        new AppError(
          "The user belonging to this token does no longer exist",
          401,
        ),
      );
    }

    // 4) Check if the password was changed after token was issued
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

  forgotPassword: AsyncCatch(async (req, res, next) => {
    // 1) get user from email
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return next(new AppError("No user found with given email", 404));

    // 2) create token and url
    const resetToken = user.createPasswordResetToken();
    const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;
    // 3) save token and token expiry to db
    await user.save({ validateBeforeSave: false });

    // 4) send the reset url to user email
    const html = resetPasswordTemplate(user.name, resetUrl, resetToken);
    await sendEmail({
      to: email,
      subject: "Your password reset link (Valid for 10min)",
      html,
      text: convert(html),
    });

    // Send response
    res.status(200).json({
      status: "success",
      message: "Password reset link has been sent to your email",
    });
  }),

  resetPassword: AsyncCatch(async (req, res, next) => {
    // 1) create hashedtoken
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.resetToken)
      .digest("hex");

    // 2) find user from hashedtoken and check token expiry
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user)
      return next(new AppError("Reset link is invalid or expired", 404));

    // 3) update user password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;

    // 4) remove reset fields
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();
    sendCookieWithToken(user, res);
    res.status(201).json({ message: "Logged in successful" });
  }),
};

module.exports = authController;
