import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let storageClient: SupabaseClient | null = null;

/**
 * Supabase client for Storage uploads. Server-side only.
 *
 * It should use the project's secret key (SUPABASE_SECRET_KEY, or the legacy
 * SUPABASE_SERVICE_ROLE_KEY), which bypasses storage policies, so the bucket
 * needs no write policy at all. With only the publishable key the bucket has
 * to accept inserts from anyone holding that key, and that key ships in every
 * browser bundle: they could upload straight to it and skip the type, size and
 * rate-limit checks in /api/upload. The fallback keeps uploads working until
 * the secret key is configured.
 */
export function getStorageClient(): SupabaseClient {
  if (storageClient) {
    return storageClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = secretKey ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !key) {
    throw new Error(
      "Missing Supabase environment variables for storage. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
    );
  }

  if (!secretKey) {
    console.warn(
      "SUPABASE_SECRET_KEY is not set; uploading with the publishable key, which requires a public insert policy on the bucket."
    );
  }

  storageClient = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return storageClient;
}
