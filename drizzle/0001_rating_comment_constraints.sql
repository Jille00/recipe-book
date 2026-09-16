CREATE INDEX "idx_recipe_slug" ON "recipe" USING btree ("slug");--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_content_length" CHECK (char_length("comment"."content") <= 1000);--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_value_range" CHECK ("rating"."value" between 1 and 5);