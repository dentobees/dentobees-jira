import mongoose, { Schema, models } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String, default: "" },
    password: { type: String, select: false },
    role: { type: String, enum: ["admin", "member", "viewer"], default: "member" },
    workspaces: [{ type: Schema.Types.ObjectId, ref: "Workspace" }],
  },
  { timestamps: true, collection: "users-jira" }
);

export const User = models.User || mongoose.model("User", userSchema);
