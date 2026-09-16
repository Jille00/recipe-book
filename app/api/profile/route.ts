import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  upsertProfile,
  updateUserName,
  getProfileByUserId,
} from "@/lib/db/queries/profile";

// Validation schema for profile updates
const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .trim()
    .optional(),
  bio: z
    .string()
    .max(500, "Bio must be 500 characters or less")
    .trim()
    .optional()
    .nullable(),
  website: z
    .string()
    .max(200, "Website URL must be 200 characters or less")
    .trim()
    .refine(
      (val) => !val || val.startsWith("https://") || val.startsWith("http://"),
      "Website must be a valid URL starting with http:// or https://"
    )
    .optional()
    .nullable(),
  location: z
    .string()
    .max(100, "Location must be 100 characters or less")
    .trim()
    .optional()
    .nullable(),
});

export async function PUT(request: Request) {
  try {
    // Verify content type
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 }
      );
    }

    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Validate input
    const validationResult = profileUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const { name } = data;

    // Update user name if changed
    if (name && name !== session.user.name) {
      await updateUserName(session.user.id, name);
    }

    // Only write the profile fields the caller actually sent - a PUT with just
    // `name` must not wipe bio/website/location. Empty strings become null.
    const profileUpdates: {
      bio?: string | null;
      website?: string | null;
      location?: string | null;
    } = {};

    if ("bio" in data) profileUpdates.bio = data.bio || null;
    if ("website" in data) profileUpdates.website = data.website || null;
    if ("location" in data) profileUpdates.location = data.location || null;

    const profile =
      Object.keys(profileUpdates).length > 0
        ? await upsertProfile(session.user.id, profileUpdates)
        : await getProfileByUserId(session.user.id);

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
