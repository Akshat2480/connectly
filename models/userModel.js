const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please tell us your name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide your email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    photo: {
      type: String,
      default: "default.jpg",
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        // Only works on CREATE and SAVE
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not the same",
      },
    },
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: String,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.index({ following: 1 });

userSchema.virtual("followers", {
  ref: "User",
  localField: "_id",
  foreignField: "following",
});

// Hash the password before saving
userSchema.pre("save", async function () {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
});

// Update passwordChangedAt whenever password is reset (not on first save)
userSchema.pre("save", function () {
  if (!this.isModified("password") || this.isNew) return;
  this.passwordChangedAt = Date.now() - 1000;
});

// Only return active users
userSchema.pre(/^find/, function () {
  this.find({ active: { $ne: false } });
});

// Instance method: compare candidate password with stored hash
userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method: check if password was changed after a JWT was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method: generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 min

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
