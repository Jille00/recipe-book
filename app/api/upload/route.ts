import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { storeRecipeImage } from "@/lib/supabase/recipe-images";
import { enforceRateLimit } from "@/lib/rate-limit";
import convert from "heic-convert";
import { detectImageType } from "@/lib/image/detect-image-type";

// Vercel Functions reject request bodies over ~4.5MB with 413
// FUNCTION_PAYLOAD_TOO_LARGE before this route runs (measured: 4.0MB arrives,
// 4.4MB does not), and that cannot be raised. The client shrinks cover photos
// to ~3.5MB or less before upload, so cap just under the platform ceiling.
const MAX_SIZE = 4 * 1024 * 1024; // 4MB
// Boundary and part headers on top of the file bytes.
const MULTIPART_OVERHEAD_ALLOWANCE = 64 * 1024;
const TOO_LARGE_MESSAGE = `Photo too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB`;

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer<ArrayBuffer>> {
  const outputBuffer = await convert({
    buffer: buffer as unknown as ArrayBuffer,
    format: "JPEG",
    quality: 0.9,
  });
  return Buffer.from(outputBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = enforceRateLimit("upload", session.user.id);
    if (limited) return limited;

    // Reject oversized requests before formData() buffers the whole body.
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_SIZE + MULTIPART_OVERHEAD_ALLOWANCE) {
      return NextResponse.json({ error: TOO_LARGE_MESSAGE }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: TOO_LARGE_MESSAGE }, { status: 400 });
    }

    // Validate the actual content, not the declared mime type / file name
    let buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(buffer);

    if (!detected) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, HEIC" },
        { status: 400 }
      );
    }

    let contentType: string = detected.mime;
    let ext: string = detected.ext;

    if (detected.mime === "image/heic") {
      buffer = await convertHeicToJpeg(buffer);
      contentType = "image/jpeg";
      ext = "jpg";
    }

    // Upload to Supabase Storage - extension comes from the detected type
    const stored = await storeRecipeImage(session.user.id, buffer, {
      contentType,
      ext,
    });

    if (!stored.ok) {
      console.error("Supabase upload error:", stored.error);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: stored.url });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
