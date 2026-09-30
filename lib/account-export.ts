/**
 * The "Export my data" download: everything a user put into Kookboek, as one
 * JSON document. Only their own rows are included. Where their data points at
 * someone else's recipe (a favorite, a comment) only that recipe's id and
 * title are given, never anything about its owner.
 */

export const ACCOUNT_EXPORT_VERSION = 1;

type Timestamp = Date | null;

export interface ExportSource {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  profile: {
    bio: string | null;
    website: string | null;
    location: string | null;
    handle: string | null;
    preferences: unknown;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  } | null;
  recipes: {
    id: string;
    title: string;
    slug: string;
    code: string;
    description: string | null;
    ingredients: unknown;
    instructions: unknown;
    prepTimeMinutes: number | null;
    cookTimeMinutes: number | null;
    servings: number | null;
    difficulty: string | null;
    imageUrl: string | null;
    nutrition: unknown;
    isPublic: boolean | null;
    copiedFromId: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }[];
  /** Tag names per recipe id. */
  recipeTags: { recipeId: string; name: string }[];
  favorites: { recipeId: string; title: string; createdAt: Timestamp }[];
  ratings: {
    recipeId: string;
    title: string;
    value: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }[];
  comments: {
    id: string;
    recipeId: string;
    title: string;
    content: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  }[];
  collections: { id: string; name: string; createdAt: Timestamp; updatedAt: Timestamp }[];
  collectionRecipes: {
    collectionId: string;
    recipeId: string;
    title: string;
    addedAt: Timestamp;
  }[];
  shoppingList: {
    id: string;
    text: string;
    amount: string | null;
    unit: string | null;
    checked: boolean;
    recipeId: string | null;
    recipeTitle: string | null;
    createdAt: Timestamp;
  }[];
}

const iso = (value: Timestamp) => (value ? value.toISOString() : null);

export function buildAccountExport(source: ExportSource, exportedAt: Date) {
  const tagsByRecipe = new Map<string, string[]>();
  for (const { recipeId, name } of source.recipeTags) {
    const tags = tagsByRecipe.get(recipeId) ?? [];
    tags.push(name);
    tagsByRecipe.set(recipeId, tags);
  }

  const recipesByCollection = new Map<string, ExportSource["collectionRecipes"]>();
  for (const entry of source.collectionRecipes) {
    const entries = recipesByCollection.get(entry.collectionId) ?? [];
    entries.push(entry);
    recipesByCollection.set(entry.collectionId, entries);
  }

  const { user, profile } = source;

  return {
    format: "kookboek-account-export",
    version: ACCOUNT_EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: iso(user.createdAt),
      updatedAt: iso(user.updatedAt),
    },
    profile: profile
      ? {
          bio: profile.bio,
          website: profile.website,
          location: profile.location,
          handle: profile.handle,
          preferences: profile.preferences ?? {},
          createdAt: iso(profile.createdAt),
          updatedAt: iso(profile.updatedAt),
        }
      : null,
    recipes: source.recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      slug: recipe.slug,
      code: recipe.code,
      description: recipe.description,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      prepTimeMinutes: recipe.prepTimeMinutes,
      cookTimeMinutes: recipe.cookTimeMinutes,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      imageUrl: recipe.imageUrl,
      nutrition: recipe.nutrition,
      isPublic: Boolean(recipe.isPublic),
      copiedFromId: recipe.copiedFromId,
      tags: (tagsByRecipe.get(recipe.id) ?? []).sort((a, b) => a.localeCompare(b)),
      createdAt: iso(recipe.createdAt),
      updatedAt: iso(recipe.updatedAt),
    })),
    favorites: source.favorites.map((favorite) => ({
      recipeId: favorite.recipeId,
      title: favorite.title,
      favoritedAt: iso(favorite.createdAt),
    })),
    ratings: source.ratings.map((rating) => ({
      recipeId: rating.recipeId,
      title: rating.title,
      value: rating.value,
      createdAt: iso(rating.createdAt),
      updatedAt: iso(rating.updatedAt),
    })),
    comments: source.comments.map((comment) => ({
      id: comment.id,
      recipeId: comment.recipeId,
      title: comment.title,
      content: comment.content,
      createdAt: iso(comment.createdAt),
      updatedAt: iso(comment.updatedAt),
    })),
    collections: source.collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      createdAt: iso(collection.createdAt),
      updatedAt: iso(collection.updatedAt),
      recipes: (recipesByCollection.get(collection.id) ?? []).map((entry) => ({
        recipeId: entry.recipeId,
        title: entry.title,
        addedAt: iso(entry.addedAt),
      })),
    })),
    shoppingList: source.shoppingList.map((item) => ({
      id: item.id,
      text: item.text,
      amount: item.amount,
      unit: item.unit,
      checked: item.checked,
      recipeId: item.recipeId,
      recipeTitle: item.recipeTitle,
      createdAt: iso(item.createdAt),
    })),
  };
}

export type AccountExport = ReturnType<typeof buildAccountExport>;

/** "kookboek-export-2026-09-30.json", in UTC so it matches exportedAt. */
export function accountExportFileName(exportedAt: Date): string {
  return `kookboek-export-${exportedAt.toISOString().slice(0, 10)}.json`;
}
