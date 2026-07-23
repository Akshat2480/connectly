const express = require("express");
const app = express();
const globalErrorHandler = require("./controller/errorController.js");

const postRouter = require("./Routes/postRoutes");
const userRouter = require("./Routes/userRoutes");
const commmentRouter = require("./Routes/commentRoutes");

app.use(express.json());

app.use((req, res, next) => {
  // console.log(req.body);
  next();
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments", commmentRouter);

app.use(globalErrorHandler);

module.exports = app;
