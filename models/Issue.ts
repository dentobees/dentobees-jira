import mongoose, { Schema, models } from "mongoose";

const issueSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["bug", "story", "task", "epic", "subtask"], default: "task" },
    status: { type: String, required: true },
    priority: { type: String, enum: ["urgent", "high", "medium", "low", "none"], default: "medium" },
    storyPoints: { type: Number, default: 0 },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    sprint: { type: Schema.Types.ObjectId, ref: "Sprint", default: null },
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    labels: [{ type: Schema.Types.ObjectId, ref: "Label" }],
    parent: { type: Schema.Types.ObjectId, ref: "Issue", default: null },
    children: [{ type: Schema.Types.ObjectId, ref: "Issue" }],
    crmTicketId: { type: Schema.Types.ObjectId, default: null },
    attachments: [
      {
        filename: String,
        url: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    dueDate: { type: Date, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "issues-jira" }
);

issueSchema.index({ project: 1, status: 1 });
issueSchema.index({ project: 1, sprint: 1 });
issueSchema.index({ assignees: 1 });
issueSchema.index({ crmTicketId: 1 });
issueSchema.index({ key: 1 }, { unique: true });

export const Issue = models.Issue || mongoose.model("Issue", issueSchema);
