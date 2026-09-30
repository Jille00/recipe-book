import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  upsertProfile,
  updateUserName,
  getProfileByUserId,
} from "@/lib/db/queries/profile";
import { isHandleTaken } from "@/lib/db/queries/public-profiles";
import { validateHandle } from "@/lib/handle";
import { isUniqueViolation } from "@/lib/public-profile";

// Validation schema for profile updates
const profileUpdateSchema = z.object({
  name: z
    .string()
    // Trim first: "   " must fail "required", not pass it and then vanish.
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
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
  // Checked with validateHandle below; "" or null clears the handle.
  handle: z.string().max(100, "Handle is too long").optional().nullable(),
});

const HANDLE_TAKEN = "That handle is already taken. Please pick another";

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

    // Handle: validated and lowercased before anything is written, so a
    // taken or invalid handle does not leave a half-saved profile behind.
    let handle: string | null | undefined;
    if ("handle" in data) {
      if (!data.handle || !data.handle.trim()) {
        handle = null;
      } else {
        const result = validateHandle(data.handle);
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        if (await isHandleTaken(result.handle, session.user.id)) {
          return NextResponse.json({ error: HANDLE_TAKEN }, { status: 409 });
        }
        handle = result.handle;
      }
    }

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
      handle?: string | null;
    } = {};

    if ("bio" in data) profileUpdates.bio = data.bio || null;
    if ("website" in data) profileUpdates.website = data.website || null;
    if ("location" in data) profileUpdates.location = data.location || null;
    if (handle !== undefined) profileUpdates.handle = handle;

    const profile =
      Object.keys(profileUpdates).length > 0
        ? await upsertProfile(session.user.id, profileUpdates)
        : await getProfileByUserId(session.user.id);

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    // Two people claiming the same handle at once: the check above passed
    // for both, the unique index stops the second.
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: HANDLE_TAKEN }, { status: 409 });
    }
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
