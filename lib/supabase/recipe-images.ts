import { getStorageClient } from "@/lib/supabase/storage";

const BUCKET = "recipe-images";

export type StoreRecipeImageResult =
  | { ok: true; url: string }
  | { ok: false; error: unknown };

/**
 * Upload an already validated image to the recipe-images bucket under the
 * user's own folder and return its public URL. The extension must come from
 * the detected (magic byte) type, never from client input.
 */
export async function storeRecipeImage(
  userId: string,
  buffer: Buffer,
  image: { contentType: string; ext: string }
): Promise<StoreRecipeImageResult> {
  const supabase = getStorageClient();

  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${image.ext}`;

  const { data, error } = await supabase.storage.from(BUCKET).upload(fileName, buffer, {
    contentType: image.contentType,
    upsert: false,
  });

  if (error) {
    return { ok: false, error };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return { ok: true, url: urlData.publicUrl };
}
