import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { upsertProfile, updateUserName } from "@/lib/db/queries/profile";

export async function PUT(request: Request) {
  try {
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio, website, location } = body;

    // Update user name if changed
    if (name && name !== session.user.name) {
      await updateUserName(session.user.id, name);
    }

    // Update profile
    const profile = await upsertProfile(session.user.id, {
      bio: bio || null,
      website: website || null,
      location: location || null,
    });

    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
