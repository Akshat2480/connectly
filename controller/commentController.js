const factory = require("./factoryController");
const Comment = require("../models/commentModel");

const commentController = {
  getComments: factory.getAll(Comment),
  getComment: factory.getOne(Comment),
  createComment: factory.createOne(Comment),
  updateComment: factory.updateOne(Comment),
  deleteComment: factory.deleteOne(Comment),
};

module.exports = commentController;
