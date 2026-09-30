-- Closes the Supabase Data API (PostgREST) off from the app's tables.
--
-- The app reads and writes every table through Drizzle, connected as the
-- `postgres` role, which owns the tables and bypasses row level security. The
-- Supabase JS client is only used for Storage. But Supabase grants the `anon`
-- and `authenticated` roles full rights on everything in `public` and serves it
-- over REST, and the key those roles use ships in the browser bundle. Without
-- this, anyone could read `account` (password hashes) and `session` (live
-- tokens), or rewrite and delete every row.
--
-- RLS with no policies denies everything to those roles; the revokes remove the
-- grants as a second layer. Nothing the app does changes.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recipe" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "recipe_tag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "favorite" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rating" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comment" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, public;--> statement-breakpoint
-- Tables added by later migrations must not pick the grants back up.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, public;--> statement-breakpoint

-- Storage: the bucket is public, so photos are served from their public URL
-- without any policy. The app only ever inserts new objects (upsert: false) and
-- never lists, overwrites or deletes them, so those policies only served
-- someone holding the browser key: listing a user's folder, replacing or
-- deleting their photos. The insert policy stays until the server uploads with
-- the secret key (see lib/supabase/storage.ts); until then, the bucket at least
-- refuses anything that isn't a photo of a sane size.
DROP POLICY IF EXISTS "Public read access" ON storage.objects;--> statement-breakpoint
DROP POLICY IF EXISTS "Allow updates" ON storage.objects;--> statement-breakpoint
DROP POLICY IF EXISTS "Allow deletes" ON storage.objects;--> statement-breakpoint
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'recipe-images';
