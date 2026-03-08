import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { User } from "@/models/User";
import { Workspace } from "@/models/Workspace";
import "@/models/Project"; // register model so populate works

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user?.workspaces?.length) {
      return NextResponse.json([]);
    }

    const workspaces = await Workspace.find({ _id: { $in: user.workspaces } })
      .populate("projects", "name key _id")
      .lean();

    return NextResponse.json(workspaces);
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

    const { name, slug } = await req.json();
    if (!name || !slug) {
      return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
    }

    await connectDB();

    const existing = await Workspace.findOne({ slug });
    if (existing) {
      return NextResponse.json({ error: "Workspace slug already exists" }, { status: 409 });
    }

    const workspace = await Workspace.create({
      name,
      slug,
      owner: session.user.id,
      members: [{ user: session.user.id, role: "owner" }],
      projects: [],
    });

    await User.findByIdAndUpdate(session.user.id, {
      $push: { workspaces: workspace._id },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
