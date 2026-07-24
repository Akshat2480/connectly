const factory = require("./factoryController");
const User = require("../models/userModel");
const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");

const userController = {
  getUsers: factory.getAll(User),
};

module.exports = userController;
