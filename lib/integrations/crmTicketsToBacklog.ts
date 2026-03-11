import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Issue } from "@/models/Issue";
import { Project } from "@/models/Project";
import { CrmTicket } from "@/models/CrmTicket";

const CRM_DEVELOPMENT_DEPARTMENT = "DEVELOPMENT";

const PRIORITY_MAP: Record<string, string> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

interface SyncOptions {
  projectId: string;
}

export const syncCrmDevelopmentTicketsToBacklog = async ({ projectId }: SyncOptions) => {
  if (!mongoose.isValidObjectId(projectId)) return;

  const crmProjectKey = process.env.CRM_DEV_PROJECT_KEY;
  if (!crmProjectKey) return;
  if (crmProjectKey !== "DEN") return;

  await connectDB();

  const project = await Project.findById(projectId);
  if (!project || project.key !== crmProjectKey) return;

  const tickets = await CrmTicket.find({
    department: CRM_DEVELOPMENT_DEPARTMENT,
    deletedAt: null,
    status: { $ne: "CLOSED" },
  })
    .select("_id issue status priority dueDate leadId createdAt")
    .lean();

  if (!tickets.length) return;

  const ticketIds = tickets.map((t) => t._id);
  const existing = await Issue.find({
    project: projectId,
    crmTicketId: { $in: ticketIds },
  })
    .select("crmTicketId")
    .lean();

  const existingSet = new Set(existing.map((i) => String(i.crmTicketId)));
  const newTickets = tickets.filter((t) => !existingSet.has(String(t._id)));

  if (!newTickets.length) return;

  const defaultStatus = project.defaultColumn ?? project.columns?.[0]?.id ?? "todo";
  const reporterId = project.lead;

  for (const ticket of newTickets) {
    try {
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        { $inc: { issueCounter: 1 } },
        { returnDocument: "after" }
      );

      const counter = updatedProject?.issueCounter ?? 1;
      const key = `${project.key}-${counter}`;

      const priority =
        PRIORITY_MAP[ticket.priority as keyof typeof PRIORITY_MAP] ?? "medium";

      const title =
        ticket.issue.length > 140 ? `${ticket.issue.slice(0, 137)}...` : ticket.issue;

      const descriptionLines = [
        ticket.issue,
        "",
        "---",
        "CRM Ticket Context:",
        `- Ticket ID: ${ticket._id.toString()}`,
        `- Department: ${CRM_DEVELOPMENT_DEPARTMENT}`,
        `- Priority at import: ${ticket.priority}`,
        `- Status at import: ${ticket.status}`,
        `- Lead ID: ${ticket.leadId?.toString() ?? "N/A"}`,
        `- Created at: ${ticket.createdAt ? ticket.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : ""}`,
      ];

      await Issue.create({
        key,
        title,
        description: descriptionLines.join("\n"),
        type: "task",
        status: defaultStatus,
        priority,
        storyPoints: 0,
        project: projectId,
        sprint: null,
        reporter: reporterId,
        assignees: [],
        labels: [],
        parent: null,
        children: [],
        attachments: [],
        dueDate: ticket.dueDate ?? null,
        order: 0,
        crmTicketId: ticket._id,
      });
    } catch (err) {
      console.error("[syncCrmDevelopmentTicketsToBacklog] failed to create issue", err);
    }
  }
};

