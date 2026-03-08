import mongoose, { Schema, models } from "mongoose";

const commentSchema = new Schema(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reactions: [
      {
        emoji: String,
        users: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],
  },
  { timestamps: true }
);

commentSchema.index({ issue: 1, createdAt: -1 });

export const Comment = models.Comment || mongoose.model("Comment", commentSchema);
