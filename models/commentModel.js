const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "A comment cannot be empty"],
      trim: true,
      maxlength: [300, "A comment cannot exceed 300 characters"],
    },
    post: {
      type: mongoose.Schema.ObjectId,
      ref: "Post",
      required: [true, "A comment must belong to a post"],
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "A comment must belong to a user"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    parentComment: {
      type: mongoose.Schema.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index for fast lookup of all comments on a given post
commentSchema.index({ post: 1 });
commentSchema.index({ parentComment: 1 });

commentSchema.virtual("replies", {
  ref: "Comment",
  foreignField: "parentComment",
  localField: "_id",
});

// Auto-populate author on every find query
commentSchema.pre(/^find/, function () {
  this.populate({
    path: "author",
    select: "name photo",
  });
  this.populate({
    path: "replies",
    select: "text author createdAt -parentComment -replies",
  });
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
