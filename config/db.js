const mongoose = require("mongoose");
const logger = require("../utils/logger");

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);

module.exports = async () => {
  await mongoose.connect(DB).then(() => {
    logger.info("Database connected");
  });
};
