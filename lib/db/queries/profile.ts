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
  // Use upsert to avoid race condition
  const [result] = await db
    .insert(profile)
    .values({
      userId,
      ...data,
    })
    .onConflictDoUpdate({
      target: profile.userId,
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();
  return result;
}

export async function updateUserName(userId: string, name: string) {
  const [updated] = await db
    .update(user)
    .set({ name })
    .where(eq(user.id, userId))
    .returning();
  return updated;
}
