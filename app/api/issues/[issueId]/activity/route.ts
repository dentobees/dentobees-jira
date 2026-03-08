import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Activity } from "@/models/Activity";
import "@/models/User";
import mongoose from "mongoose";

export async function GET(
  _req: NextRequest,
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

    const activities = await Activity.find({ issue: issueId })
      .populate("actor", "name email image")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(JSON.parse(JSON.stringify(activities)));
  } catch (err) {
    console.error("[GET /api/issues/[issueId]/activity]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
