import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, profile } from "@/lib/db";
import { eq } from "drizzle-orm";
import type { UnitSystem } from "@/types/units";

interface UserPreferences {
  unitSystem: UnitSystem;
}

// Safely parse and validate preferences from database
function parsePreferences(rawPreferences: unknown): Partial<UserPreferences> {
  if (!rawPreferences || typeof rawPreferences !== "object") {
    return {};
  }
  const prefs = rawPreferences as Record<string, unknown>;
  const result: Partial<UserPreferences> = {};
  if (prefs.unitSystem === "metric" || prefs.unitSystem === "imperial") {
    result.unitSystem = prefs.unitSystem;
  }
  return result;
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

    const storedPreferences = parsePreferences(userProfile?.preferences);
    const preferences: UserPreferences = {
      unitSystem: storedPreferences.unitSystem || "imperial",
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { unitSystem } = body;

    // Validate unitSystem
    if (unitSystem && unitSystem !== "metric" && unitSystem !== "imperial") {
      return NextResponse.json(
        { error: "Invalid unit system" },
        { status: 400 }
      );
    }

    // Get current profile to merge preferences
    const userProfile = await db.query.profile.findFirst({
      where: eq(profile.userId, session.user.id),
    });

    const currentPreferences = parsePreferences(userProfile?.preferences);
    const newPreferences: UserPreferences = {
      unitSystem: unitSystem || currentPreferences.unitSystem || "imperial",
    };

    // Use upsert to avoid race condition
    await db
      .insert(profile)
      .values({
        userId: session.user.id,
        preferences: newPreferences,
      })
      .onConflictDoUpdate({
        target: profile.userId,
        set: {
          preferences: newPreferences,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json(newPreferences);
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
