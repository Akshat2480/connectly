const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    ],
    lastMessage: { type: mongoose.Schema.ObjectId, ref: "Message" },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1 });

conversationSchema.pre(/^find/, function () {
  this.populate({ path: "participants", select: "name photo" }).populate({
    path: "lastMessage",
    select: "text",
  });
});

module.exports = mongoose.model("Conversation", conversationSchema);
