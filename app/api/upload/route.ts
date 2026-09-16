import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStorageClient } from "@/lib/supabase/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import convert from "heic-convert";

// Vercel Functions reject request bodies over ~4.5MB with 413
// FUNCTION_PAYLOAD_TOO_LARGE before this route runs (measured: 4.0MB arrives,
// 4.4MB does not), and that cannot be raised. The client shrinks cover photos
// to ~3.5MB or less before upload, so cap just under the platform ceiling.
const MAX_SIZE = 4 * 1024 * 1024; // 4MB
// Boundary and part headers on top of the file bytes.
const MULTIPART_OVERHEAD_ALLOWANCE = 64 * 1024;
const TOO_LARGE_MESSAGE = `Photo too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB`;

type DetectedImage = {
  mime: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/heic";
  ext: "jpg" | "png" | "webp" | "gif" | "heic";
};

const HEIF_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

/**
 * Determine the real image type from the file's magic bytes. The
 * client-declared `file.type` and `file.name` are attacker controlled, so they
 * are never trusted for validation or for the stored object's extension.
 */
function detectImageType(buffer: Buffer): DetectedImage | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: "image/png", ext: "png" };
  }

  // GIF: "GIF87a" / "GIF89a"
  const header6 = buffer.subarray(0, 6).toString("latin1");
  if (header6 === "GIF87a" || header6 === "GIF89a") {
    return { mime: "image/gif", ext: "gif" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  // HEIC/HEIF: ISO-BMFF box with "ftyp" at offset 4 and a HEIF brand
  if (buffer.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("latin1");
    if (HEIF_BRANDS.has(brand)) {
      return { mime: "image/heic", ext: "heic" };
    }
  }

  return null;
}

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

    // Get storage client (lazy initialization)
    const supabase = getStorageClient();

    // Generate unique filename - extension comes from the detected type
    const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("recipe-images")
      .upload(fileName, buffer, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("recipe-images")
      .getPublicUrl(data.path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
