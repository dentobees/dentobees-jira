import mongoose, { Schema, models } from "mongoose";

const projectSchema = new Schema(
  {
    name: { type: String, required: true },
    key: { type: String, required: true },
    description: { type: String, default: "" },
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    lead: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    columns: [
      {
        id: String,
        name: String,
        color: String,
        order: Number,
      },
    ],
    defaultColumn: { type: String },
    issueCounter: { type: Number, default: 0 },
  },
  { timestamps: true }
);

projectSchema.index({ workspace: 1 });
projectSchema.index({ key: 1, workspace: 1 }, { unique: true });

export const Project = models.Project || mongoose.model("Project", projectSchema);
