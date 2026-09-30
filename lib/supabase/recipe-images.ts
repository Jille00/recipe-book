import { getStorageClient } from "@/lib/supabase/storage";
import { isStorableImageType, sanitizeImage } from "@/lib/image/sanitize-image";

export const RECIPE_IMAGES_BUCKET = "recipe-images";
const BUCKET = RECIPE_IMAGES_BUCKET;

export type StoreRecipeImageResult =
  | { ok: true; url: string }
  // invalidImage: the bytes didn't decode as the image they claimed to be.
  | { ok: false; error: unknown; invalidImage?: boolean };

/**
 * Upload an already validated image to the recipe-images bucket under the
 * user's own folder and return its public URL. The extension must come from
 * the detected (magic byte) type, never from client input. The image is
 * re-encoded first, which strips EXIF such as the GPS position of the photo.
 */
export async function storeRecipeImage(
  userId: string,
  buffer: Buffer,
  image: { contentType: string; ext: string }
): Promise<StoreRecipeImageResult> {
  if (!isStorableImageType(image.contentType)) {
    return { ok: false, error: new Error(`Unsupported type ${image.contentType}`), invalidImage: true };
  }

  let clean: Buffer;
  try {
    clean = await sanitizeImage(buffer, image.contentType);
  } catch (error) {
    return { ok: false, error, invalidImage: true };
  }

  const supabase = getStorageClient();

  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${image.ext}`;

  const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, clean, {
    contentType: image.contentType,
    upsert: false,
  });

  if (error) {
    return { ok: false, error };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { ok: true, url: urlData.publicUrl };
}

/**
 * The object path of a public recipe-images URL, e.g. "{userId}/123-abc.jpg",
 * or null for anything else (another bucket, another host, a pasted link).
 */
export function recipeImagePath(url: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !base) return null;
  const prefix = `${base.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.slice(prefix.length).split(/[?#]/)[0]);
  // Reject anything that could step outside a user's folder.
  if (!path || path.includes("..") || path.startsWith("/")) return null;
  return path;
}

/**
 * Deletes a recipe photo that is no longer used. Only removes objects in the
 * owner's own folder, so pointing a recipe at someone else's photo URL can't
 * be used to delete it. Best effort: a failure leaves an orphan, nothing worse.
 */
export async function deleteRecipeImage(
  url: string | null | undefined,
  ownerId: string
): Promise<void> {
  const path = recipeImagePath(url);
  if (!path || !path.startsWith(`${ownerId}/`)) return;

  const { error } = await getStorageClient().storage.from(BUCKET).remove([path]);
  if (error) console.error("Deleting recipe image failed:", error);
}
