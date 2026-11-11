import { sql } from "drizzle-orm";
import { recipe, recipeTag, tag } from "@/lib/db";

/**
 * A recipe's tag names, alphabetical, as a column for list queries: labels
 * use them to pick the recipe's colour and show the first as its category.
 *
 * Only use it in a select that has a join. In a single-table select Drizzle
 * drops the table prefixes from sql fragments, which would turn the
 * correlation into `"recipe_id" = "id"` and match the wrong rows.
 */
export const recipeTagNames = sql<string[]>`(
  select coalesce(array_agg(${tag.name} order by ${tag.name}), '{}')
  from ${recipeTag}
  join ${tag} on ${tag.id} = ${recipeTag.tagId}
  where ${recipeTag.recipeId} = ${recipe.id}
)`;
