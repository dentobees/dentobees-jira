import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Project } from "@/models/Project";
import { Workspace } from "@/models/Workspace";
import "@/models/User"; // register for lead populate

const DEFAULT_COLUMNS = [
  { id: "col-todo", name: "TODO", color: "#dfe1e6", order: 0 },
  { id: "col-in-progress", name: "IN PROGRESS", color: "#0052cc", order: 1 },
  { id: "col-in-review", name: "IN REVIEW", color: "#ff991f", order: 2 },
  { id: "col-done", name: "DONE", color: "#00875a", order: 3 },
];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId query param is required" }, { status: 400 });
    }

    await connectDB();

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isMember = workspace.members.some(
      (m: { user?: { toString: () => string } }) => m.user?.toString() === session.user?.id
    );
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const projects = await Project.find({ workspace: workspaceId })
      .populate("lead", "name email image")
      .lean();

    return NextResponse.json(projects);
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

    const { name, key, description, workspaceId } = await req.json();
    if (!name || !key || !workspaceId) {
      return NextResponse.json({ error: "name, key, and workspaceId are required" }, {
        status: 400,
      });
    }

    await connectDB();

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const currentMember = workspace.members.find(
      (m: { user?: { toString: () => string }; role: string }) => m.user?.toString() === session.user?.id
    );
    if (!currentMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (currentMember.role === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingKey = await Project.findOne({ workspace: workspaceId, key });
    if (existingKey) {
      return NextResponse.json({ error: "Project key already exists in workspace" }, {
        status: 409,
      });
    }

    const project = await Project.create({
      name,
      key,
      description: description || "",
      workspace: workspaceId,
      lead: session.user.id,
      members: [],
      columns: DEFAULT_COLUMNS,
      defaultColumn: DEFAULT_COLUMNS[0].id,
      issueCounter: 0,
    });

    workspace.projects.push(project._id);
    await workspace.save();

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
