// import-dev-data.js
// Usage:
//   node import-dev-data.js --import   -> loads users, posts, comments into Atlas
//   node import-dev-data.js --delete   -> wipes all three collections

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: "./.env" });

// Adjust these paths to wherever your Mongoose models actually live
const User = require("../models/userModel");
const Post = require("../models/postModel");
const Comment = require("../models/commentModel");

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log("DB connection successful"));

// READ JSON FILES
const users = JSON.parse(
  fs.readFileSync(path.join(__dirname, "users.json"), "utf-8"),
);
const posts = JSON.parse(
  fs.readFileSync(path.join(__dirname, "posts.json"), "utf-8"),
);
const comments = JSON.parse(
  fs.readFileSync(path.join(__dirname, "comments.json"), "utf-8"),
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    // { validateBeforeSave: false } skips passwordConfirm validation issues;
    // create() (not insertMany) so the pre-save bcrypt hook actually runs
    await User.create(users, { validateBeforeSave: false });
    await Post.create(posts);
    await Comment.create(comments);
    console.log("Data successfully loaded!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Post.deleteMany();
    await Comment.deleteMany();
    console.log("Data successfully deleted!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
}
