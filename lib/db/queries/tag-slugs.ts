import { sql } from "drizzle-orm";
import { recipe, recipeTag, tag } from "@/lib/db";

/**
 * A recipe's tag slugs, alphabetical by name, as a column for list queries:
 * cards use them to pick the motif of the recipe's Delft tile.
 */
export const recipeTagSlugs = sql<string[]>`(
  select coalesce(array_agg(${tag.slug} order by ${tag.name}), '{}')
  from ${recipeTag}
  join ${tag} on ${tag.id} = ${recipeTag.tagId}
  where ${recipeTag.recipeId} = ${recipe.id}
)`;
