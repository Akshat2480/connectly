const asyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");

exports.getAll = (Model) =>
  asyncCatch(async (req, res, next) => {
    const doc = await Model.find();

    res.status(200).json({
      status: "success",
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model) =>
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
  });

exports.createOne = (Model) =>
  asyncCatch(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.updateOne = (Model) =>
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
  });

exports.deleteOne = (Model) =>
  asyncCatch(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc)
      return next(new AppError("No document found with the given id", 404));

    res.status(204).json({
      status: "success",
      data: null,
    });
  });
