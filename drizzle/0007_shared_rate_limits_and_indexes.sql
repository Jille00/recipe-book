CREATE TABLE "app_rate_limit" (
	"key" text NOT NULL,
	"window_start" bigint NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "app_rate_limit_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
DROP INDEX "idx_comment_recipe_id";--> statement-breakpoint
DROP INDEX "idx_comment_created_at";--> statement-breakpoint
DROP INDEX "idx_favorite_user_id";--> statement-breakpoint
DROP INDEX "idx_recipe_user_id";--> statement-breakpoint
DROP INDEX "idx_recipe_is_public";--> statement-breakpoint
DROP INDEX "idx_recipe_share_token";--> statement-breakpoint
CREATE INDEX "idx_app_rate_limit_window_start" ON "app_rate_limit" USING btree ("window_start");--> statement-breakpoint
CREATE INDEX "idx_comment_recipe_created" ON "comment" USING btree ("recipe_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_favorite_user_created" ON "favorite" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_favorite_recipe_id" ON "favorite" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_recipe_user_created" ON "recipe" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_recipe_public_created" ON "recipe" USING btree ("created_at") WHERE "recipe"."is_public";--> statement-breakpoint
-- Like every other table (see 0004): only the app's own connection may touch these.
ALTER TABLE "app_rate_limit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_limit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON "app_rate_limit", "rate_limit" FROM anon, authenticated;
