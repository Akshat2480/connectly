const Notification = require("../models/NotificationModel");

module.exports = async ({ recipient, sender, type, post }) => {
  console.log(recipient, sender);
  if (recipient.toString() === sender.toString()) return;

  await Notification.create({ recipient, sender, type, post });
};
