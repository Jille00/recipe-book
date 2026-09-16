-- Generates the unguessable code in a recipe's public address, /r/{code}/{slug}.
--
-- 12 characters from a 32-symbol alphabet that drops look-alikes (0/o, 1/l), so
-- a link survives being read aloud or retyped. Randomness comes from
-- gen_random_uuid(), which is cryptographically strong. Each character takes
-- the low 5 bits of one byte; 32 symbols means that mapping has no modulo bias.
-- Byte 6 is skipped because the uuid version nibble fixes one of its low bits,
-- leaving 12 fully random 5-bit draws: 60 bits of entropy.
--
-- It is a column default rather than app code so that adding the column also
-- backfills every existing row (a volatile default is evaluated per row), and
-- so no insert can ever omit it, including from code deployed before this.
CREATE OR REPLACE FUNCTION public.generate_recipe_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  alphabet constant text := '23456789abcdefghijkmnpqrstuvwxyz';
  raw bytea := uuid_send(gen_random_uuid());
  positions constant int[] := ARRAY[0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];
  result text := '';
  pos int;
BEGIN
  FOREACH pos IN ARRAY positions LOOP
    result := result || substr(alphabet, (get_byte(raw, pos) & 31) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "code" text DEFAULT public.generate_recipe_code() NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_code_unique" UNIQUE("code");