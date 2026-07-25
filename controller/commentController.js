const factory = require("./factoryController");
const Comment = require("../models/commentModel");

const commentController = {
  getComments: factory.getAll(Comment),
  getComment: factory.getOne(Comment),
  createComment: factory.createOne(Comment, ["text", "post"]),
  deleteComment: factory.deleteOne(Comment),
};

module.exports = commentController;
