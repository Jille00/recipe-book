CREATE TABLE "collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "collection_name_length" CHECK (char_length("collection"."name") between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "collection_recipe" (
	"collection_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "collection_recipe_collection_id_recipe_id_pk" PRIMARY KEY("collection_id","recipe_id")
);
--> statement-breakpoint
CREATE TABLE "shopping_list_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"recipe_id" uuid,
	"text" text NOT NULL,
	"amount" text,
	"unit" text,
	"checked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "shopping_list_item_text_length" CHECK (char_length("shopping_list_item"."text") between 1 and 500)
);
--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "copied_from_id" uuid;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_recipe" ADD CONSTRAINT "collection_recipe_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_recipe" ADD CONSTRAINT "collection_recipe_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_item" ADD CONSTRAINT "shopping_list_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_item" ADD CONSTRAINT "shopping_list_item_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_collection_user_created" ON "collection" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_collection_recipe_recipe_id" ON "collection_recipe" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_shopping_list_item_user_created" ON "shopping_list_item" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_copied_from_id_recipe_id_fk" FOREIGN KEY ("copied_from_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_handle_unique" UNIQUE("handle");--> statement-breakpoint
-- /u/{handle}: 3-30 characters, lowercase letters, digits and inner hyphens.
ALTER TABLE "profile" ADD CONSTRAINT "profile_handle_format" CHECK ("handle" ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$');--> statement-breakpoint
-- Like every other table (see 0004): only the app's own connection may touch these.
ALTER TABLE "collection" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collection_recipe" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shopping_list_item" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON "collection", "collection_recipe", "shopping_list_item" FROM anon, authenticated;
