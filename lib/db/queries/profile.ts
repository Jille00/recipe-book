import { db } from "@/lib/db";
import { profile, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getProfileByUserId(userId: string) {
  const result = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, userId))
    .limit(1);

  return result[0] || null;
}

export async function upsertProfile(
  userId: string,
  data: {
    bio?: string | null;
    website?: string | null;
    location?: string | null;
  }
) {
  const existing = await getProfileByUserId(userId);

  if (existing) {
    const [updated] = await db
      .update(profile)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(profile.userId, userId))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(profile)
      .values({
        userId,
        ...data,
      })
      .returning();
    return created;
  }
}

export async function updateUserName(userId: string, name: string) {
  const [updated] = await db
    .update(user)
    .set({ name })
    .where(eq(user.id, userId))
    .returning();
  return updated;
}
