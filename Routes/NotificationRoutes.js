const express = require("express");
const notificationController = require("../controller/notificationController");
const authController = require("../controller/authController");
const { markAsReadValidator } = require("../validators/notificationValidator");
const { validate } = require("../models/commentModel");

const router = express.Router();

router.use(authController.protect);
router.get("/", notificationController.getNotifications);
router.patch(
  "/:id",
  markAsReadValidator,
  validate,
  notificationController.markAsRead,
);

module.exports = router;
