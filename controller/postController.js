const factory = require("./factoryController");
const Post = require("../models/postModel");

exports.getPosts = factory.getAll(Post)
exports.getPost = factory.getOne(Post)
exports.createPost = factory.createOne(Post)
exports.updatePost = factory.updateOne(Post)
exports.deletePost = factory.deleteOne(Post)