const express = require("express");
const authController = require("../controller/authController");
const conversationController = require("../controller/conversationController");

const router = express.Router();

router.get(
  "/",
  authController.protect,
  conversationController.getMyConversations,
);

router.get(
  "/start/:userId",
  authController.protect,
  conversationController.getOrCreateConversation,
);

router.get(
  "/:conversationId/messages",
  authController.protect,
  conversationController.getMessages,
);

module.exports = router;
