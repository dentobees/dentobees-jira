import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Project } from "@/models/Project";
import { Workspace } from "@/models/Workspace";
import "@/models/User"; // register for lead/members populate
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    if (!mongoose.isValidObjectId(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    await connectDB();

    const project = await Project.findById(projectId)
      .populate("lead", "name email image")
      .populate("members", "name email image")
      .lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const workspace = await Workspace.findById(project.workspace);
    const isMember = workspace?.members.some(
      (m: { user?: { toString: () => string } }) => m.user?.toString() === session.user?.id
    );
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    if (!mongoose.isValidObjectId(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    await connectDB();

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const workspace = await Workspace.findById(project.workspace);
    const currentMemberPatch = workspace?.members.find(
      (m: { user?: { toString: () => string }; role: string }) => m.user?.toString() === session.user?.id
    );
    if (!currentMemberPatch) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (currentMemberPatch.role === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, key, description, columns, defaultColumn, addMember, removeMember } = await req.json();

    if (addMember !== undefined) {
      if (!mongoose.isValidObjectId(addMember)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }
      const alreadyMember = project.members.some(
        (m: { toString: () => string }) => m.toString() === addMember
      );
      if (!alreadyMember) project.members.push(addMember);
      await project.save();
      return NextResponse.json(project);
    }

    if (removeMember !== undefined) {
      project.members = project.members.filter(
        (m: { toString: () => string }) => m.toString() !== removeMember
      );
      await project.save();
      return NextResponse.json(project);
    }

    if (name !== undefined) project.name = name;
    if (key !== undefined) {
      const existing = await Project.findOne({
        workspace: project.workspace,
        key,
        _id: { $ne: projectId },
      });
      if (existing) {
        return NextResponse.json({ error: "Project key already exists in workspace" }, { status: 409 });
      }
      project.key = key;
    }
    if (description !== undefined) project.description = description;
    if (columns !== undefined) project.columns = columns;
    if (defaultColumn !== undefined) project.defaultColumn = defaultColumn;

    await project.save();
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    if (!mongoose.isValidObjectId(projectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    await connectDB();

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const workspace = await Workspace.findById(project.workspace);
    const currentMemberDelete = workspace?.members.find(
      (m: { user?: { toString: () => string }; role: string }) => m.user?.toString() === session.user?.id
    );
    if (!currentMemberDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (currentMemberDelete.role === "viewer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Workspace.findByIdAndUpdate(project.workspace, {
      $pull: { projects: projectId },
    });
    await Project.findByIdAndDelete(projectId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
