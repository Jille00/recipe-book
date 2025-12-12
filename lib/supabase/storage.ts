import { createClient, SupabaseClient } from "@supabase/supabase-js";

let storageClient: SupabaseClient | null = null;

/**
 * Get Supabase client with service role key for storage operations.
 * This client has admin privileges and should only be used server-side.
 */
export function getStorageClient(): SupabaseClient {
  if (storageClient) {
    return storageClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase environment variables for storage. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY in your .env.local file."
    );
  }

  storageClient = createClient(supabaseUrl, supabaseServiceKey);
  return storageClient;
}
