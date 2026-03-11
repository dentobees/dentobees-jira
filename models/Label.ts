import mongoose, { Schema, models } from "mongoose";

const labelSchema = new Schema(
  {
    name: { type: String, required: true },
    color: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  },
  { collection: "labels-jira" }
);

labelSchema.index({ project: 1 });

export const Label = models.Label || mongoose.model("Label", labelSchema);
