import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStorageClient } from "@/lib/supabase/storage";
import convert from "heic-convert";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function convertHeicToJpeg(buffer: ArrayBuffer): Promise<Buffer> {
  const outputBuffer = await convert({
    buffer: Buffer.from(buffer) as unknown as ArrayBuffer,
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check for HEIC files by extension if mime type isn't detected
    const isHeic = file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type) && !isHeic) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF, HEIC" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Get storage client (lazy initialization)
    const supabase = getStorageClient();

    // Handle HEIC conversion
    let fileData: Buffer | File = file;
    let contentType = file.type;
    let ext = file.name.split(".").pop() || "jpg";

    if (isHeic) {
      const bytes = await file.arrayBuffer();
      fileData = await convertHeicToJpeg(bytes);
      contentType = "image/jpeg";
      ext = "jpg";
    }

    // Generate unique filename
    const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("recipe-images")
      .upload(fileName, fileData, {
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
