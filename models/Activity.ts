import mongoose, { Schema, models } from "mongoose";

const activitySchema = new Schema({
  issue: { type: Schema.Types.ObjectId, ref: "Issue", required: true },
  actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  from: { type: String, default: "" },
  to: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

activitySchema.index({ issue: 1, createdAt: -1 });

export const Activity = models.Activity || mongoose.model("Activity", activitySchema);
