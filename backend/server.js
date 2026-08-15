const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const logger = require("./utils/logger");

dotenv.config({ path: "./.env", quiet: true });

require("./models/userModel");
require("./models/postModel");
require("./models/commentModel");
require("./models/conversationModel");
require("./models/messageModel");
const app = require("./app");

const socketAuth = require("./socket/socketAuth");
const registerChatSocket = require("./socket/chatSocket");

process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION - shutting down...", {
    message: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

require("./config/db")();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});
io.use(socketAuth);
registerChatSocket(io);

const port = process.env.PORT;
server.listen(port, "0.0.0.0", () => {
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
