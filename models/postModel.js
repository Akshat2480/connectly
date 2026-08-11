const mongoose = require("mongoose");
const cloudinary = require("../utils/cloudinary");

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
    images: {
      type: [
        {
          url: {
            type: String,
            required: true,
          },
          publicId: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },
    imageStatus: {
      type: String,
      enum: ["processing", "done", "failed", "partial"],
      default: "processing",
    },
    expectedImageCount: { type: Number, default: 0 },
    processedImageCount: { type: Number, default: 0 },
    failedImageCount: { type: Number, default: 0 },
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

// Auto delete all the comments of the post before deleting the post
postSchema.pre("findOneAndDelete", async function () {
  const post = await this.model.findOne(this.getFilter());

  if (post) {
    const Comment = require("./commentModel");
    await Comment.deleteMany({ post: post._id });
  }
});

postSchema.post("findOneAndDelete", async function (doc) {
  if (!doc.images) return;

  doc.images.map(async (image) => {
    await cloudinary.uploader.destroy(image.publicId);
  });
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
