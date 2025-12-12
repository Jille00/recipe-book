import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  jsonb,
  index,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =====================
// Better Auth Tables (from generated auth-schema.ts)
// =====================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

// =====================
// Application Tables
// =====================

export const profile = pgTable("profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  website: text("website"),
  location: text("location"),
  preferences: jsonb("preferences").default({ unitSystem: "imperial" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tag = pgTable("tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recipe = pgTable(
  "recipe",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    ingredients: jsonb("ingredients").notNull().default([]),
    instructions: jsonb("instructions").notNull().default([]),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    servings: integer("servings"),
    difficulty: text("difficulty"),
    imageUrl: text("image_url"),
    nutrition: jsonb("nutrition"),
    isPublic: boolean("is_public").default(false),
    shareToken: text("share_token").unique(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_recipe_user_id").on(table.userId),
    index("idx_recipe_is_public").on(table.isPublic),
    index("idx_recipe_share_token").on(table.shareToken),
    index("idx_recipe_created_at").on(table.createdAt),
    unique("recipe_user_slug_unique").on(table.userId, table.slug),
  ]
);

export const recipeTag = pgTable(
  "recipe_tag",
  {
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.recipeId, table.tagId] }),
    index("idx_recipe_tag_recipe_id").on(table.recipeId),
    index("idx_recipe_tag_tag_id").on(table.tagId),
  ]
);

export const favorite = pgTable(
  "favorite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_favorite_user_id").on(table.userId),
    unique("favorite_user_recipe_unique").on(table.userId, table.recipeId),
  ]
);

export const rating = pgTable(
  "rating",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    value: integer("value").notNull(), // 1-5 stars
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_rating_recipe_id").on(table.recipeId),
    index("idx_rating_user_id").on(table.userId),
    unique("rating_user_recipe_unique").on(table.userId, table.recipeId),
  ]
);

export const comment = pgTable(
  "comment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipe.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_comment_recipe_id").on(table.recipeId),
    index("idx_comment_user_id").on(table.userId),
    index("idx_comment_created_at").on(table.createdAt),
  ]
);

// =====================
// Relations
// =====================

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  profile: one(profile),
  recipes: many(recipe),
  favorites: many(favorite),
  ratings: many(rating),
  comments: many(comment),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, {
    fields: [profile.userId],
    references: [user.id],
  }),
}));

export const tagRelations = relations(tag, ({ many }) => ({
  recipeTags: many(recipeTag),
}));

export const recipeRelations = relations(recipe, ({ one, many }) => ({
  user: one(user, {
    fields: [recipe.userId],
    references: [user.id],
  }),
  recipeTags: many(recipeTag),
  favorites: many(favorite),
  ratings: many(rating),
  comments: many(comment),
}));

export const recipeTagRelations = relations(recipeTag, ({ one }) => ({
  recipe: one(recipe, {
    fields: [recipeTag.recipeId],
    references: [recipe.id],
  }),
  tag: one(tag, {
    fields: [recipeTag.tagId],
    references: [tag.id],
  }),
}));

export const favoriteRelations = relations(favorite, ({ one }) => ({
  user: one(user, {
    fields: [favorite.userId],
    references: [user.id],
  }),
  recipe: one(recipe, {
    fields: [favorite.recipeId],
    references: [recipe.id],
  }),
}));

export const ratingRelations = relations(rating, ({ one }) => ({
  user: one(user, {
    fields: [rating.userId],
    references: [user.id],
  }),
  recipe: one(recipe, {
    fields: [rating.recipeId],
    references: [recipe.id],
  }),
}));

export const commentRelations = relations(comment, ({ one }) => ({
  user: one(user, {
    fields: [comment.userId],
    references: [user.id],
  }),
  recipe: one(recipe, {
    fields: [comment.recipeId],
    references: [recipe.id],
  }),
}));

// =====================
// Types
// =====================

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Profile = typeof profile.$inferSelect;
export type Recipe = typeof recipe.$inferSelect;
export type NewRecipe = typeof recipe.$inferInsert;
export type Tag = typeof tag.$inferSelect;
export type Favorite = typeof favorite.$inferSelect;
export type Rating = typeof rating.$inferSelect;
export type NewRating = typeof rating.$inferInsert;
export type Comment = typeof comment.$inferSelect;
export type NewComment = typeof comment.$inferInsert;
