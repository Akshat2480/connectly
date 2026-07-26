const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();

const postRouter = require("./Routes/postRoutes");
const userRouter = require("./Routes/userRoutes");
const commmentRouter = require("./Routes/commentRoutes");
const globalErrorHandler = require("./controller/errorController.js");

app.use(express.json());
app.use(cookieParser());
app.use(express.static(`${__dirname}/public`))

app.use((req, res, next) => {
  // console.log(req.cookies);
  next();
});

app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments", commmentRouter);

app.use(globalErrorHandler);

module.exports = app;
