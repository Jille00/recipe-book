import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, profile } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { UnitSystem } from "@/types/units";

interface UserPreferences {
  unitSystem: UnitSystem;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userProfile = await db.query.profile.findFirst({
      where: eq(profile.userId, session.user.id),
    });

    const preferences: UserPreferences = {
      unitSystem: "imperial",
      ...((userProfile?.preferences as Partial<UserPreferences>) || {}),
    };

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { unitSystem } = body;

    // Validate unitSystem
    if (unitSystem && unitSystem !== "metric" && unitSystem !== "imperial") {
      return NextResponse.json(
        { error: "Invalid unit system" },
        { status: 400 }
      );
    }

    // Get or create profile
    let userProfile = await db.query.profile.findFirst({
      where: eq(profile.userId, session.user.id),
    });

    const currentPreferences =
      (userProfile?.preferences as Partial<UserPreferences>) || {};
    const newPreferences: UserPreferences = {
      unitSystem: unitSystem || currentPreferences.unitSystem || "imperial",
    };

    if (userProfile) {
      // Update existing profile
      await db
        .update(profile)
        .set({
          preferences: newPreferences,
          updatedAt: new Date(),
        })
        .where(eq(profile.userId, session.user.id));
    } else {
      // Create new profile
      await db.insert(profile).values({
        userId: session.user.id,
        preferences: newPreferences,
      });
    }

    return NextResponse.json(newPreferences);
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
