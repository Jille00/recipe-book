import { pgTable, index, foreignKey, text, timestamp, unique, uuid, jsonb, integer, boolean, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: 'string' }),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
}, (table) => [
	index("account_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk"
		}).onDelete("cascade"),
]);

export const category = pgTable("category", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("category_name_unique").on(table.name),
	unique("category_slug_unique").on(table.slug),
]);

export const favorite = pgTable("favorite", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	recipeId: uuid("recipe_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_favorite_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipe.id],
			name: "favorite_recipe_id_recipe_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "favorite_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("favorite_user_recipe_unique").on(table.userId, table.recipeId),
]);

export const recipe = pgTable("recipe", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	slug: text().notNull(),
	description: text(),
	ingredients: jsonb().default([]).notNull(),
	instructions: jsonb().default([]).notNull(),
	prepTimeMinutes: integer("prep_time_minutes"),
	cookTimeMinutes: integer("cook_time_minutes"),
	servings: integer(),
	difficulty: text(),
	imageUrl: text("image_url"),
	isPublic: boolean("is_public").default(false),
	shareToken: text("share_token"),
	categoryId: uuid("category_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_recipe_category_id").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("idx_recipe_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_recipe_is_public").using("btree", table.isPublic.asc().nullsLast().op("bool_ops")),
	index("idx_recipe_share_token").using("btree", table.shareToken.asc().nullsLast().op("text_ops")),
	index("idx_recipe_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [category.id],
			name: "recipe_category_id_category_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "recipe_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("recipe_user_slug_unique").on(table.userId, table.slug),
	unique("recipe_share_token_unique").on(table.shareToken),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("verification_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("user_email_unique").on(table.email),
]);

export const profile = pgTable("profile", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	bio: text(),
	website: text(),
	location: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "profile_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("profile_user_id_unique").on(table.userId),
]);

export const tag = pgTable("tag", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("tag_name_unique").on(table.name),
	unique("tag_slug_unique").on(table.slug),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull(),
}, (table) => [
	index("session_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk"
		}).onDelete("cascade"),
	unique("session_token_unique").on(table.token),
]);

export const recipeTag = pgTable("recipe_tag", {
	recipeId: uuid("recipe_id").notNull(),
	tagId: uuid("tag_id").notNull(),
}, (table) => [
	index("idx_recipe_tag_recipe_id").using("btree", table.recipeId.asc().nullsLast().op("uuid_ops")),
	index("idx_recipe_tag_tag_id").using("btree", table.tagId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipe.id],
			name: "recipe_tag_recipe_id_recipe_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tag.id],
			name: "recipe_tag_tag_id_tag_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.recipeId, table.tagId], name: "recipe_tag_recipe_id_tag_id_pk"}),
]);
