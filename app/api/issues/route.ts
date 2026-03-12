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
import { syncCrmDevelopmentTicketsToBacklog } from "@/lib/integrations/crmTicketsToBacklog";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    await connectDB();

    await syncCrmDevelopmentTicketsToBacklog({ projectId });

    const filter: Record<string, unknown> = { project: projectId };
    const status = searchParams.get("status");
    if (status) filter.status = status;
    const priority = searchParams.get("priority");
    if (priority) filter.priority = priority;
    const type = searchParams.get("type");
    if (type) filter.type = type;
    const assignee = searchParams.get("assignee");
    if (assignee && mongoose.isValidObjectId(assignee)) filter.assignees = assignee;
    const sprint = searchParams.get("sprint");
    if (sprint !== null) {
      if (sprint === "null" || sprint === "") {
        filter.$or = [{ sprint: null }, { sprint: { $exists: false } }];
      } else if (mongoose.isValidObjectId(sprint)) {
        filter.sprint = new mongoose.Types.ObjectId(sprint);
      }
    }
    const search = searchParams.get("search");
    if (search) filter.title = { $regex: search, $options: "i" };

    const issues = await Issue.find(filter)
      .populate("reporter", "name email image")
      .populate("assignees", "name email image")
      .populate("labels")
      .sort({ order: 1 })
      .lean();

    // Force plain-JSON serialization so Mongoose ObjectIds / Dates are clean strings
    return NextResponse.json(JSON.parse(JSON.stringify(issues)));
  } catch (err) {
    console.error("[GET /api/issues]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      description,
      type,
      priority,
      projectId,
      assignees,
      labels,
      sprint,
      storyPoints,
      dueDate,
      parentId,
      attachments,
    } = body;
    if (!title || !projectId) {
      return NextResponse.json({ error: "title and projectId are required" }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    await connectDB();

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const workspace = await Workspace.findById(project.workspace).select("members").lean();
    const currentMember = (workspace?.members as { user: unknown; role: string }[] | undefined)?.find(
      (m) => String(m.user) === session.user?.id
    );
    if (currentMember?.role === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await Project.findByIdAndUpdate(
      projectId,
      { $inc: { issueCounter: 1 } },
      { returnDocument: "after" }
    );
    const counter = updated?.issueCounter ?? 1;
    const key = `${project.key}-${counter}`;

    const defaultStatus = project.defaultColumn ?? project.columns?.[0]?.id ?? "todo";

    const issue = await Issue.create({
      key,
      title,
      description: description ?? "",
      type: type ?? "task",
      priority: priority ?? "medium",
      status: defaultStatus,
      project: projectId,
      reporter: session.user.id,
      assignees: assignees ?? [],
      labels: labels ?? [],
      sprint: sprint || null,
      storyPoints: storyPoints ?? 0,
      dueDate: dueDate ? new Date(dueDate) : null,
      parent: parentId || null,
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    if (parentId && mongoose.isValidObjectId(parentId)) {
      await Issue.findByIdAndUpdate(parentId, { $push: { children: issue._id } });
    }
    if (sprint && mongoose.isValidObjectId(sprint)) {
      await Sprint.findByIdAndUpdate(sprint, { $push: { issues: issue._id } });
    }

    await Activity.create({
      issue: issue._id,
      actor: session.user.id,
      action: "created issue",
    });

    const populated = await Issue.findById(issue._id)
      .populate("reporter", "name email image")
      .populate("assignees", "name email image")
      .populate("labels")
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch (err) {
    console.error("[POST /api/issues]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
