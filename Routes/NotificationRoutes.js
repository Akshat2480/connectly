const express = require("express");
const notificationController = require("../controller/notificationController");
const authController = require("../controller/authController");

const router = express.Router();

router.use(authController.protect);
router.get("/", notificationController.getNotifications);
router.patch("/:id", notificationController.markAsRead);

module.exports = router;
