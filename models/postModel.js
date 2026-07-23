const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "A post cannot be empty"],
      trim: true,
      maxlength: [500, "A post cannot exceed 500 characters"],
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "A post must belong to a user"],
    },
    likes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual field: number of likes, without storing a redundant count
postSchema.virtual("likesCount").get(function () {
  return this.likes.length;
});

// Virtual populate: comments belonging to this post (not stored in DB)
postSchema.virtual("comments", {
  ref: "Comment",
  foreignField: "post",
  localField: "_id",
});

// Auto-populate author on every find query
postSchema.pre(/^find/, function () {
  this.populate({
    path: "author",
    select: "name photo",
  });
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
