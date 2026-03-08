import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Sprint } from "@/models/Sprint";
import { Project } from "@/models/Project";
import { Workspace } from "@/models/Workspace";
import "@/models/Issue"; // register for issues populate
import "@/models/User";  // register for assignees inside issues
import mongoose from "mongoose";

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

    const sprints = await Sprint.find({ project: projectId })
      .populate({
        path: "issues",
        select: "key title status priority assignees storyPoints",
        populate: { path: "assignees", select: "name email image" },
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(sprints);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, goal, projectId, startDate, endDate } = await req.json();
    if (!name || !projectId) {
      return NextResponse.json({ error: "name and projectId are required" }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }

    await connectDB();

    const project = await Project.findById(projectId).select("workspace").lean();
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const workspace = await Workspace.findById((project as { workspace: unknown }).workspace).select("members").lean();
    const currentMember = (workspace?.members as { user: unknown; role: string }[] | undefined)?.find(
      (m) => String(m.user) === session.user?.id
    );
    if (currentMember?.role === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sprint = await Sprint.create({
      name,
      goal: goal ?? "",
      project: projectId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
