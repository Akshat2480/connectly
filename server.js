const dotenv = require("dotenv");
const mongoose = require("mongoose");
const swaggerConfig = require("./swaggerConfig");

// .env files loaded
dotenv.config({ path: "./.env", quiet: true });

require("./models/userModel");
require("./models/postModel");
require("./models/commentModel");
const app = require("./app");

// Uncaught Expeption
process.on("uncaughtException", (err) => {
  console.log("ERROR UNCAUGHT EXCEPTION", err);
  process.exit(1);
});

// database connection
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB)
  .then(() => console.log("Database connected successfully!"));

swaggerConfig(app);

// starts listening to the port
const port = process.env.PORT;
const server = app.listen(port, "127.0.0.1", () => {
  console.log(`The server is listening on port ${port}`);
});

// Unhandled Rejection
process.on("unhandledRejection", (err) => {
  console.log("ERROR UNHANDLED REJECTION", err);
  server.close(() => {
    process.exit(1);
  });
});
