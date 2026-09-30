ALTER TABLE "recipe" ADD COLUMN "rating_average" numeric(3, 2);--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(description, '')), 'B') || setweight(to_tsvector('simple', coalesce(jsonb_path_query_array(ingredients, '$[*].text')::text, '')), 'C')) STORED;--> statement-breakpoint
CREATE INDEX "idx_recipe_search_vector" ON "recipe" USING gin ("search_vector");--> statement-breakpoint
-- Recomputes one recipe's rating_average/rating_count from its ratings. A full
-- recompute (not +1/-1 arithmetic) can't drift, and a recipe's ratings are few.
CREATE OR REPLACE FUNCTION public.refresh_recipe_rating(target uuid) RETURNS void
LANGUAGE sql AS $$
  UPDATE public.recipe r
  SET rating_average = s.average, rating_count = s.total
  FROM (
    SELECT avg(value)::numeric(3, 2) AS average, count(*)::int AS total
    FROM public.rating WHERE recipe_id = target
  ) s
  WHERE r.id = target;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.rating_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_recipe_rating(NEW.recipe_id);
  END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.recipe_id <> NEW.recipe_id) THEN
    PERFORM public.refresh_recipe_rating(OLD.recipe_id);
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER rating_refresh_recipe
AFTER INSERT OR UPDATE OF value, recipe_id OR DELETE ON public.rating
FOR EACH ROW EXECUTE FUNCTION public.rating_changed();--> statement-breakpoint
-- Like every other function here (see 0004): not callable over the Data API.
REVOKE EXECUTE ON FUNCTION public.refresh_recipe_rating(uuid), public.rating_changed() FROM anon, authenticated, public;--> statement-breakpoint
-- Backfill from the ratings that already exist.
UPDATE public.recipe r
SET rating_average = s.average, rating_count = s.total
FROM (
  SELECT recipe_id, avg(value)::numeric(3, 2) AS average, count(*)::int AS total
  FROM public.rating GROUP BY recipe_id
) s
WHERE r.id = s.recipe_id;
