const Notification = require("../models/NotificationModel");

module.exports = async ({ recipient, sender, type, post }) => {
  if (recipient.toString() === sender.toString()) return;

  await Notification.create({ recipient, sender, type, post });
};
