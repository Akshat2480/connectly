const dotenv = require("dotenv");
const mongoose = require("mongoose");
const logger = require("./utils/logger");

dotenv.config({ path: "./.env", quiet: true });

require("./models/userModel");
require("./models/postModel");
require("./models/commentModel");
const app = require("./app");

process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION - shutting down...", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB)
  .then(() => logger.info("Database connected successfully!"));

const port = process.env.PORT;
const server = app.listen(port, "0.0.0.0", () => {
  logger.info(`The server is listening on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION - shutting down...", {
    message: err.message,
    stack: err.stack,
  });
  server.close(() => {
    process.exit(1);
  });
});
