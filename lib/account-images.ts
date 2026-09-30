import { and, isNotNull, like, ne } from "drizzle-orm";
import { db, recipe } from "@/lib/db";
import { getStorageClient } from "@/lib/supabase/storage";
import { RECIPE_IMAGES_BUCKET, recipeImagePath } from "@/lib/supabase/recipe-images";

/**
 * Removing a user's photos when they delete their account.
 *
 * Every upload lives under "{userId}/" in the recipe-images bucket. A copy
 * another user saved of one of this user's recipes keeps pointing at the same
 * photo URL, though, so photos that another user's recipe still shows are
 * left in place; deleting them would break those copies.
 */

const PAGE_SIZE = 1000;
/** Storage's remove() takes a list; keep each call a reasonable size. */
const REMOVE_BATCH = 100;

/** The parts of the Supabase storage bucket API this module uses. */
export interface ImageBucket {
  list(
    path: string,
    options: { limit: number; offset: number }
  ): Promise<{ data: { name: string; id: string | null }[] | null; error: unknown }>;
  remove(paths: string[]): Promise<{ error: unknown }>;
}

export interface RemoveUserImagesDeps {
  bucket: ImageBucket;
  /** Image URLs of recipes owned by anyone except `userId` that point into their folder. */
  findImageUrlsUsedByOthers(userId: string): Promise<string[]>;
}

/**
 * Every file path under `folder`, walking into subfolders. Folders come back
 * from list() without an id.
 */
export async function listFolder(bucket: ImageBucket, folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await bucket.list(folder, { limit: PAGE_SIZE, offset });
    if (error) throw error;
    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${folder}/${entry.name}`;
      if (entry.id) paths.push(path);
      else paths.push(...(await listFolder(bucket, path)));
    }
    if (entries.length < PAGE_SIZE) return paths;
  }
}

/**
 * The paths that may be deleted: those in the user's own folder that no
 * other user's recipe shows. URLs are compared by the object they point at,
 * so the same photo with a different query string still counts as in use.
 */
export function imagesSafeToDelete(
  userId: string,
  paths: string[],
  urlsUsedByOthers: string[]
): string[] {
  const inUse = new Set(
    urlsUsedByOthers.map((url) => recipeImagePath(url)).filter((path) => path !== null)
  );
  return paths.filter((path) => path.startsWith(`${userId}/`) && !inUse.has(path));
}

/** LIKE pattern for `text` taken literally (%, _ and \ escaped). */
function literal(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

const defaultDeps = (): RemoveUserImagesDeps => ({
  bucket: getStorageClient().storage.from(RECIPE_IMAGES_BUCKET),
  async findImageUrlsUsedByOthers(userId) {
    const rows = await db
      .select({ imageUrl: recipe.imageUrl })
      .from(recipe)
      .where(
        and(
          ne(recipe.userId, userId),
          isNotNull(recipe.imageUrl),
          like(recipe.imageUrl, `%/${RECIPE_IMAGES_BUCKET}/${literal(userId)}/%`)
        )
      );
    return rows.map((row) => row.imageUrl).filter((url): url is string => url !== null);
  },
});

/**
 * Deletes the user's photos from storage, except those another user's recipe
 * still shows. Throws when storage can't be listed or cleared, so account
 * deletion stops instead of leaving photos behind for an account that's gone.
 * Returns how many files were removed and how many were kept.
 */
export async function removeUserImages(
  userId: string,
  deps: RemoveUserImagesDeps = defaultDeps()
): Promise<{ removed: number; kept: number }> {
  // Never let an odd id turn the folder into the bucket root.
  if (!userId || userId.includes("/") || userId.includes("..")) {
    throw new Error("Invalid user id for image removal");
  }

  const paths = await listFolder(deps.bucket, userId);
  if (paths.length === 0) return { removed: 0, kept: 0 };

  const deletable = imagesSafeToDelete(
    userId,
    paths,
    await deps.findImageUrlsUsedByOthers(userId)
  );

  for (let i = 0; i < deletable.length; i += REMOVE_BATCH) {
    const { error } = await deps.bucket.remove(deletable.slice(i, i + REMOVE_BATCH));
    if (error) throw error;
  }

  return { removed: deletable.length, kept: paths.length - deletable.length };
}
