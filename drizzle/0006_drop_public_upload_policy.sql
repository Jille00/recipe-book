-- The server now uploads with the secret key (SUPABASE_SECRET_KEY), which
-- bypasses storage policies. This insert policy only let anyone holding the
-- browser key upload straight to the bucket, skipping /api/upload's checks.
--
-- Run it only once a deployment with SUPABASE_SECRET_KEY is live, or uploads
-- stop working.
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
