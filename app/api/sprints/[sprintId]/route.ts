import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Sprint } from "@/models/Sprint";
import { Issue } from "@/models/Issue";
import { Project } from "@/models/Project";
import { Workspace } from "@/models/Workspace";
import "@/models/User";  // register for assignees populate inside issues
import "@/models/Label"; // register for labels populate inside issues
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
  { params }: { params: Promise<{ sprintId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sprintId } = await params;
    if (!mongoose.isValidObjectId(sprintId)) {
      return NextResponse.json({ error: "Invalid sprint ID" }, { status: 400 });
    }

    await connectDB();

    const sprint = await Sprint.findById(sprintId)
      .populate({
        path: "issues",
        populate: [
          { path: "reporter", select: "name email image" },
          { path: "assignees", select: "name email image" },
          { path: "labels" },
        ],
      })
      .lean();

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    return NextResponse.json(sprint);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sprintId } = await params;
    if (!mongoose.isValidObjectId(sprintId)) {
      return NextResponse.json({ error: "Invalid sprint ID" }, { status: 400 });
    }

    await connectDB();

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    if (await isViewer(sprint.project, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, goal, status, startDate, endDate } = body;

    if (status === "active" && sprint.status !== "active") {
      const existingActive = await Sprint.findOne({
        project: sprint.project,
        status: "active",
        _id: { $ne: sprintId },
      });
      if (existingActive) {
        return NextResponse.json(
          { error: "Another sprint is already active for this project" },
          { status: 409 }
        );
      }
    }

    if (status === "completed" && sprint.status !== "completed") {
      const project = await Project.findById(sprint.project);
      const doneColumn =
        project?.columns?.find((c: { name?: string }) => /done/i.test(c.name || "")) ??
        project?.columns?.sort((a: { order?: number }, b: { order?: number }) => (b.order ?? 0) - (a.order ?? 0))[0];
      const doneColumnId = doneColumn?.id ?? "__none__";

      const filter: Record<string, unknown> = { _id: { $in: sprint.issues ?? [] } };
      filter.status = { $ne: doneColumnId };

      const unfinished = await Issue.find(filter).select("_id");
      const unfinishedIds = unfinished.map((i) => i._id);
      await Issue.updateMany(filter, { $set: { sprint: null } });
      sprint.issues = (sprint.issues ?? []).filter((id: mongoose.Types.ObjectId) => !unfinishedIds.some((uid) => uid.equals(id)));
    }

    if (name !== undefined) sprint.name = name;
    if (goal !== undefined) sprint.goal = goal;
    if (status !== undefined) sprint.status = status;
    if (startDate !== undefined) sprint.startDate = new Date(startDate);
    if (endDate !== undefined) sprint.endDate = new Date(endDate);

    await sprint.save();

    const updated = await Sprint.findById(sprintId)
      .populate({
        path: "issues",
        populate: [
          { path: "reporter", select: "name email image" },
          { path: "assignees", select: "name email image" },
          { path: "labels" },
        ],
      })
      .lean();

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sprintId } = await params;
    if (!mongoose.isValidObjectId(sprintId)) {
      return NextResponse.json({ error: "Invalid sprint ID" }, { status: 400 });
    }

    await connectDB();

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    if (await isViewer(sprint.project, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Issue.updateMany({ sprint: sprintId }, { $set: { sprint: null } });
    await Sprint.findByIdAndDelete(sprintId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
