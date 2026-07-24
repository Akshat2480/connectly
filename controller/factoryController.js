const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");

const factory = {
  getAll: (Model) =>
    asyncCatch(async (req, res, next) => {
      const doc = await Model.find();

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

  createOne: (Model) =>
    asyncCatch(async (req, res, next) => {
      const doc = await Model.create(req.body);

      res.status(201).json({
        status: "success",
        data: {
          data: doc,
        },
      });
    }),

  updateOne: (Model) =>
    asyncCatch(async (req, res, next) => {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        returnDocument: "after",
      });

      if (!doc)
        return next(new AppError("No document found with the given id", 404));

      res.status(200).json({
        status: "success",
        data: {
          data: doc,
        },
      });
    }),
  deleteOne: (Model) =>
    asyncCatch(async (req, res, next) => {
      const doc = await Model.findByIdAndDelete(req.params.id);

      if (!doc)
        return next(new AppError("No document found with the given id", 404));

      res.status(204).json({
        status: "success",
        data: null,
      });
    }),
};

module.exports = factory;
