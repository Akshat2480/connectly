const Notification = require("../models/NotificationModel");
const apiFeatures = require("../utils/apiFeatures");
const AsyncCatch = require("../utils/AsyncCatch");
const factory = require("./factoryController");

const notificationController = {
  getNotifications: factory.getAll(Notification),

  markAsRead: AsyncCatch(async (req, res, next) => {
    await Notification.updateOne(
      {
        _id: req.params.id,
        recipient: req.user.id,
      },
      { read: true },
    );

    res.status(200).json({ message: "success" });
  }),
};

module.exports = notificationController 