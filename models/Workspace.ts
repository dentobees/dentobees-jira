import mongoose, { Schema, models } from "mongoose";

const workspaceSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        role: { type: String, enum: ["owner", "admin", "member", "viewer"], default: "member" },
      },
    ],
    projects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
  },
  { timestamps: true }
);

export const Workspace = models.Workspace || mongoose.model("Workspace", workspaceSchema);
