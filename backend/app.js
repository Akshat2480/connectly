const cookieParser = require("cookie-parser");
const express = require("express");
const morgan = require("morgan");
const { rateLimit } = require("express-rate-limit");
const helmet = require("helmet");
const hpp = require("hpp");
const cors = require("cors");
const compression = require("compression");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const app = express();

const postRouter = require("./Routes/postRoutes");
const userRouter = require("./Routes/userRoutes");
const commentRouter = require("./Routes/commentRoutes");
const conversationRouter = require("./Routes/conversationRoutes");
const globalErrorHandler = require("./controller/errorController");

const logger = require("./utils/logger");
const rateLimiting = require("./utils/rateLimiting");

app.use(express.json());
app.use(cookieParser());
app.use(express.static(`${__dirname}/public`));

// DISABLED CURRENTLY BECAUSE IMPLEMENTING THIS FEATURE WITH REDIS
// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000,
//   limit: 100,
// });
// app.set("trust proxy", 1);
// app.use(limiter);

app.use(
  rateLimiting({
    windowSeconds: 60,
    max: 100,
    prefix: "global",
  }),
);

app.use(helmet());
app.use(hpp());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

app.use(compression());

const morganStream = { write: (message) => logger.http(message.trim()) };
if (process.env.NODE_ENV === "development")
  app.use(morgan("dev", { stream: morganStream }));

const swaggerDocument = YAML.load("./docs/openapi.yaml");
app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/conversations", conversationRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(globalErrorHandler);

module.exports = app;
