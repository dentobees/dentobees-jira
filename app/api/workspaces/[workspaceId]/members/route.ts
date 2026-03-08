import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { User } from "@/models/User";
import { Workspace } from "@/models/Workspace";
import mongoose from "mongoose";

type WorkspaceMember = { user?: { toString: () => string }; role?: string };

export async function POST(
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

    const { email, role } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    await connectDB();

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isOwnerOrAdmin = workspace.members.some(
      (m: WorkspaceMember) =>
        m.user?.toString() === session.user?.id &&
        (m.role === "owner" || m.role === "admin")
    );
    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const alreadyMember = workspace.members.some(
      (m: WorkspaceMember) => m.user?.toString() === user._id.toString()
    );
    if (alreadyMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    workspace.members.push({
      user: user._id,
      role: role || "member",
    });
    await workspace.save();

    if (!user.workspaces?.some((w: { toString: () => string }) => w.toString() === workspaceId)) {
      await User.findByIdAndUpdate(user._id, {
        $push: { workspaces: workspaceId },
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
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

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    await connectDB();

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const isOwnerOrAdmin = workspace.members.some(
      (m: WorkspaceMember) =>
        m.user?.toString() === session.user?.id &&
        (m.role === "owner" || m.role === "admin")
    );
    if (!isOwnerOrAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const memberToRemove = workspace.members.find((m: WorkspaceMember) => m.user?.toString() === userId);
    if (!memberToRemove) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (memberToRemove.role === "owner") {
      return NextResponse.json({ error: "Cannot remove workspace owner" }, { status: 400 });
    }

    workspace.members = workspace.members.filter((m: WorkspaceMember) => m.user?.toString() !== userId);
    await workspace.save();

    await User.findByIdAndUpdate(userId, {
      $pull: { workspaces: workspaceId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
