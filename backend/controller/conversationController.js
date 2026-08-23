const Conversation = require("../models/conversationModel");
const Message = require("../models/messageModel");
const AsyncCatch = require("../utils/AsyncCatch");
const AppError = require("../utils/AppError");

const conversationController = {
  getMyConversations: AsyncCatch(async (req, res) => {
    const conversations = await Conversation.find({
      participants: req.user.id,
    }).sort("-updatedAt");
    res.status(200).json({
      status: "success",
      data: { results: conversations.length, conversations },
    });
  }),

  getOrCreateConversation: AsyncCatch(async (req, res, next) => {
    const { userId } = req.params;
    if (userId === req.user.id)
      return next(
        new AppError("Cannot start a conversation with yourself", 400),
      );

    let convo = await Conversation.findOne({
      participants: { $all: [req.user.id, userId], $size: 2 },
    });
    if (!convo)
      convo = await Conversation.create({
        participants: [req.user.id, userId],
      });

    res.status(200).json({ status: "success", data: { conversation: convo } });
  }),

  getMessages: AsyncCatch(async (req, res, next) => {
    const { conversationId } = req.params;
    const convo = await Conversation.findOne({
      _id: conversationId,
      participants: req.user.id,
    });
    if (!convo) return next(new AppError("Conversation not found", 404));

    const messages = await Message.find({ conversation: conversationId })
      .sort("-createdAt")
      .limit(50);
    res.status(200).json({
      status: "success",
      data: { results: messages.length, messages },
    });
  }),
};

module.exports = conversationController;
