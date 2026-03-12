import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Issue } from "@/models/Issue";
import { Project } from "@/models/Project";
import { Workspace } from "@/models/Workspace";
import { Activity } from "@/models/Activity";
import { Sprint } from "@/models/Sprint";
import "@/models/User";  // register for reporter/assignees populate
import "@/models/Label"; // register for labels populate
import mongoose from "mongoose";

async function isViewer(projectId: unknown, userId: string): Promise<boolean> {
  const project = await Project.findById(projectId).select("workspace").lean();
  if (!project) return false;
  const workspace = await Workspace.findById((project as { workspace: unknown }).workspace).select("members").lean();
  const member = (workspace?.members as { user: unknown; role: string }[] | undefined)?.find(
    (m) => String(m.user) === userId
  );
  return member?.role === "viewer";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { issueId } = await params;
    if (!mongoose.isValidObjectId(issueId)) {
      return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 });
    }

    await connectDB();

    const issue = await Issue.findById(issueId)
      .populate("reporter", "name email image")
      .populate("assignees", "name email image")
      .populate("labels")
      .populate("sprint")
      .populate("parent", "title key status type priority assignees")
      .populate({
        path: "children",
        select: "title key status type priority assignees",
        populate: { path: "assignees", select: "name email image" },
      })
      .lean();

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    return NextResponse.json(issue);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { issueId } = await params;
    if (!mongoose.isValidObjectId(issueId)) {
      return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 });
    }

    await connectDB();

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    if (await isViewer(issue.project, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      type,
      status,
      priority,
      assignees,
      labels,
      sprint,
      storyPoints,
      dueDate,
      order,
      attachments,
    } = body;

    if (status !== undefined && status !== issue.status) {
      await Activity.create({
        issue: issue._id,
        actor: session.user.id,
        action: "changed status",
        from: issue.status,
        to: status,
      });
      issue.status = status;
    }
    if (assignees !== undefined) {
      const prevAssignees = (issue.assignees as mongoose.Types.ObjectId[]).map((a) => a.toString()).sort().join(",");
      const newAssignees = (assignees as string[]).map((a) => a.toString()).sort().join(",");
      if (prevAssignees !== newAssignees) {
        await Activity.create({
          issue: issue._id,
          actor: session.user.id,
          action: "changed assignees",
          from: prevAssignees,
          to: newAssignees,
        });
        issue.assignees = assignees;
      }
    }
    if (priority !== undefined && priority !== issue.priority) {
      await Activity.create({
        issue: issue._id,
        actor: session.user.id,
        action: "changed priority",
        from: issue.priority,
        to: priority,
      });
      issue.priority = priority;
    }

    if (title !== undefined) issue.title = title;
    if (description !== undefined) issue.description = description;
    if (type !== undefined) issue.type = type;
    if (labels !== undefined) issue.labels = labels;
    if (sprint !== undefined) {
      const oldSprint = issue.sprint?.toString();
      const newSprint = sprint ? sprint.toString() : null;
      if (oldSprint !== newSprint) {
        if (oldSprint) {
          await Sprint.findByIdAndUpdate(oldSprint, { $pull: { issues: issueId } });
        }
        if (newSprint) {
          await Sprint.findByIdAndUpdate(newSprint, { $push: { issues: issueId } });
        }
        issue.sprint = sprint;
      }
    }
    if (storyPoints !== undefined) issue.storyPoints = storyPoints;
    if (dueDate !== undefined) issue.dueDate = dueDate ? new Date(dueDate) : null;
    if (order !== undefined) issue.order = order;
    if (attachments !== undefined) issue.attachments = attachments;

    await issue.save();

    const updated = await Issue.findById(issueId)
      .populate("reporter", "name email image")
      .populate("assignees", "name email image")
      .populate("labels")
      .populate("sprint")
      .populate("parent", "title key status type priority assignees")
      .populate({
        path: "children",
        select: "title key status type priority assignees",
        populate: { path: "assignees", select: "name email image" },
      })
      .lean();

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { issueId } = await params;
    if (!mongoose.isValidObjectId(issueId)) {
      return NextResponse.json({ error: "Invalid issue ID" }, { status: 400 });
    }

    await connectDB();

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    if (await isViewer(issue.project, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (issue.parent) {
      await Issue.findByIdAndUpdate(issue.parent, { $pull: { children: issueId } });
    }

    if (issue.sprint) {
      await Sprint.findByIdAndUpdate(issue.sprint, { $pull: { issues: issueId } });
    }

    await Issue.findByIdAndDelete(issueId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
