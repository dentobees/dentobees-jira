import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadBufferToS3 } from "@/lib/s3";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploads: { filename: string; url: string; size: number }[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      if (!file.type.startsWith("image/")) {
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `public/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

      const { url } = await uploadBufferToS3({
        buffer,
        key,
        contentType: file.type || "application/octet-stream",
      });

      uploads.push({
        filename: file.name,
        url,
        size: file.size,
      });
    }

    if (!uploads.length) {
      return NextResponse.json({ error: "No valid image files to upload" }, { status: 400 });
    }

    return NextResponse.json(uploads, { status: 200 });
  } catch (err) {
    console.error("[POST /api/uploads]", err);
    return NextResponse.json({ error: "Failed to upload files" }, { status: 500 });
  }
}

