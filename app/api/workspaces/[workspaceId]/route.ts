import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Workspace } from "@/models/Workspace";
import { User } from "@/models/User";
import "@/models/Project"; // register model so populate works
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;
    if (!mongoose.isValidObjectId(workspaceId)) {
      return NextResponse.json({ error: "Invalid workspace ID" }, { status: 400 });
    }

    await connectDB();

    const workspace = await Workspace.findById(workspaceId)
      .populate("members.user", "name email image")
      .populate("projects", "name key _id")
      .lean();

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isMember = workspace.members?.some((m: { user?: { _id?: unknown } | unknown }) => {
      const u = m.user;
      if (!u) return false;
      const id = typeof u === "object" && u !== null && "_id" in u ? (u as { _id: unknown })._id : u;
      return id && String(id) === session.user?.id;
    });
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(workspace);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;
    if (!mongoose.isValidObjectId(workspaceId)) {
      return NextResponse.json({ error: "Invalid workspace ID" }, { status: 400 });
    }

    await connectDB();

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isOwner = workspace.owner?.toString() === session.user.id;
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, slug } = await req.json();
    if (name !== undefined) workspace.name = name;
    if (slug !== undefined) {
      const existing = await Workspace.findOne({ slug, _id: { $ne: workspaceId } });
      if (existing) {
        return NextResponse.json({ error: "Workspace slug already exists" }, { status: 409 });
      }
      workspace.slug = slug;
    }

    await workspace.save();
    return NextResponse.json(workspace);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = await params;
    if (!mongoose.isValidObjectId(workspaceId)) {
      return NextResponse.json({ error: "Invalid workspace ID" }, { status: 400 });
    }

    await connectDB();

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (workspace.owner?.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { User } = await import("@/models/User");
    await User.updateMany(
      { workspaces: workspaceId },
      { $pull: { workspaces: workspaceId } }
    );

    await Workspace.findByIdAndDelete(workspaceId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
