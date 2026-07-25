const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");

const factory = {
  getAll: (Model) =>
    asyncCatch(async (req, res, next) => {
      let filter = req.params.userId ? { author: req.params.userId } : {};
      filter = req.params.postId ? { post: req.params.postId } : {};
      const doc = await Model.find(filter);

      res.status(200).json({
        status: "success",
        results: doc.length,
        data: {
          data: doc,
        },
      });
    }),

  getOne: (Model) =>
    asyncCatch(async (req, res, next) => {
      const doc = await Model.findById(req.params.id);

      if (!doc)
        return next(new AppError("No document found with the given id", 404));

      res.status(200).json({
        status: "success",
        data: {
          data: doc,
        },
      });
    }),

  createOne: (Model, allowedFields = []) =>
    asyncCatch(async (req, res, next) => {
      const filteredBody = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          filteredBody[field] = req.body[field];
        }
      });
      filteredBody.author = req.user.id;
      if (req.params.postId) filteredBody.post = req.params.postId;

      const doc = await Model.create(filteredBody);

      res.status(201).json({
        status: "success",
        data: {
          data: doc,
        },
      });
    }),

  updateOne: (Model, allowedFields = []) =>
    asyncCatch(async (req, res, next) => {
      const currDoc = await Model.findById(req.params.id);

      if (!currDoc)
        return next(new AppError("No document found with the given id", 404));

      if (currDoc.author.id !== req.user.id)
        return next(new AppError("You are not the author of this post", 403));

      const filteredBody = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          filteredBody[field] = req.body[field];
        }
      });

      const updatedDoc = await Model.findByIdAndUpdate(
        req.params.id,
        filteredBody,
        {
          runValidators: true,
          returnDocument: "after",
        },
      );

      res.status(200).json({
        status: "success",
        data: {
          data: updatedDoc,
        },
      });
    }),

  deleteOne: (Model) =>
    asyncCatch(async (req, res, next) => {
      const doc = await Model.findById(req.params.id);

      if (!doc)
        return next(new AppError("No document found with the given id", 404));

      if (doc.author.id !== req.user.id)
        return next(new AppError("You are not the author of this post", 403));

      await Model.findByIdAndDelete(req.params.id);

      res.status(204).send();
    }),
};

module.exports = factory;
