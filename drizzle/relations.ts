import { relations } from "drizzle-orm/relations";
import { user, account, recipe, favorite, category, profile, session, recipeTag, tag } from "./schema";

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	accounts: many(account),
	favorites: many(favorite),
	recipes: many(recipe),
	profiles: many(profile),
	sessions: many(session),
}));

export const favoriteRelations = relations(favorite, ({one}) => ({
	recipe: one(recipe, {
		fields: [favorite.recipeId],
		references: [recipe.id]
	}),
	user: one(user, {
		fields: [favorite.userId],
		references: [user.id]
	}),
}));

export const recipeRelations = relations(recipe, ({one, many}) => ({
	favorites: many(favorite),
	category: one(category, {
		fields: [recipe.categoryId],
		references: [category.id]
	}),
	user: one(user, {
		fields: [recipe.userId],
		references: [user.id]
	}),
	recipeTags: many(recipeTag),
}));

export const categoryRelations = relations(category, ({many}) => ({
	recipes: many(recipe),
}));

export const profileRelations = relations(profile, ({one}) => ({
	user: one(user, {
		fields: [profile.userId],
		references: [user.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const recipeTagRelations = relations(recipeTag, ({one}) => ({
	recipe: one(recipe, {
		fields: [recipeTag.recipeId],
		references: [recipe.id]
	}),
	tag: one(tag, {
		fields: [recipeTag.tagId],
		references: [tag.id]
	}),
}));

export const tagRelations = relations(tag, ({many}) => ({
	recipeTags: many(recipeTag),
}));