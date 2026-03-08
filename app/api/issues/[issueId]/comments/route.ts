import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Comment } from "@/models/Comment";
import { Activity } from "@/models/Activity";
import "@/models/User"; // register for author populate
import mongoose from "mongoose";

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

    const comments = await Comment.find({ issue: issueId })
      .populate("author", "name email image")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
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

    const { body, mentions } = await req.json();
    if (!body) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    await connectDB();

    const comment = await Comment.create({
      issue: issueId,
      author: session.user.id,
      body,
      mentions: mentions ?? [],
    });

    await Activity.create({
      issue: issueId,
      actor: session.user.id,
      action: "added comment",
    });

    const populated = await Comment.findById(comment._id)
      .populate("author", "name email image")
      .lean();

    return NextResponse.json(populated, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
