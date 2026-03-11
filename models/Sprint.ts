import mongoose, { Schema, models } from "mongoose";

const sprintSchema = new Schema(
  {
    name: { type: String, required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    goal: { type: String, default: "" },
    status: { type: String, enum: ["planning", "active", "completed"], default: "planning" },
    startDate: { type: Date },
    endDate: { type: Date },
    issues: [{ type: Schema.Types.ObjectId, ref: "Issue" }],
  },
  { timestamps: true, collection: "sprints-jira" }
);

sprintSchema.index({ project: 1, status: 1 });

export const Sprint = models.Sprint || mongoose.model("Sprint", sprintSchema);
