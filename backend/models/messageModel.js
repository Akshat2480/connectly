const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.ObjectId,
      red: "Conversation",
      required: true,
    },
    sender: { type: mongoose.Schema.ObjectId, ref: "User", required: true },
    text: {
      type: String,
      required: [true, "A message cannot be empty"],
      trim: true,
      maxlength: 2000,
    },
    readBy: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

messageSchema.index({ conversation: 1, createdAt: -1 });

messageSchema.pre(/^find/, function () {
  this.populate({ path: "sender", select: "name photo" });
});

module.exports = mongoose.model("Message", messageSchema);
