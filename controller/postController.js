const factory = require("./factoryController");
const Post = require("../models/postModel");

const postController = {
  getPosts: factory.getAll(Post),
  getPost: factory.getOne(Post),
  createPost: factory.createOne(Post),
  updatePost: factory.updateOne(Post),
  deletePost: factory.deleteOne(Post),
};

module.exports = postController;
