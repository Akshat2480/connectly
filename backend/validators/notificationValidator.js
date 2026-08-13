const { mongoId } = require("./commonValidator");

exports.markAsReadValidator = [mongoId()];
