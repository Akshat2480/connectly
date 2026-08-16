const Conversation = require("../models/conversationModel");
const Message = require("../models/messageModel");
const { redisClient } = require("../config/redisConnection");
const logger = require("../utils/logger");

const ONLINE_PREFIX = "online:";

module.exports = (io) => {
  io.on("connection", async (socket) => {
    const userId = socket.user.id;
    logger.debug(`Socket connected: ${userId}`);

    await redisClient.sadd(`${ONLINE_PREFIX}${userId}`, socket.id);
    socket.broadcast.emit("user:online", { userId });

    socket.on("conversation:join", async (conversationId) => {
      const convo = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      });
      if (!convo) return socket.emit("error", "Not a participant");
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("message:send", async ({ conversationId, text }, ack) => {
      try {
        const convo = await Conversation.findOne({
          _id: conversationId,
          participants: userId,
        });
        if (!convo) return ack?.({ error: "Not a participant" });

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          text,
          readBy: [userId],
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
        });
        const populated = await message.populate({
          path: "sender",
          select: "name photo",
        });

        io.to(`conversation:${conversationId}`).emit("message:new", populated);
        ack?.({ status: "success", data: populated });
      } catch (err) {
        logger.error("message:send failed", { message: err.message });
        ack?.({ error: "Failed to send message" });
      }
    });

    socket.on("message:read", async ({ conversationId, messageId }) => {
      await Message.findByIdAndUpdate(messageId, {
        $addToSet: { readBy: userId },
      });
      socket
        .to(`conversation:${conversationId}`)
        .emit("message:read", { messageId, userId });
    });

    socket.on("typing:start", ({ conversationId }) => {
      socket
        .to(`conversation:${conversationId}`)
        .emit("typing:start", { userId });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      socket
        .to(`conversation:${conversationId}`)
        .emit("typing:stop", { userId });
    });

    socket.on("disconnect", async () => {
      await redisClient.srem(`${ONLINE_PREFIX}${userId}`, socket.id);
      const remaining = await redisClient.scard(`${ONLINE_PREFIX}${userId}`);
      if (remaining === 0) socket.broadcast.emit("user:offline", { userId });
      logger.debug(`Socket:disconnected: ${userId}`);
    });
  });
};
