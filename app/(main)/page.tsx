import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPublicRecipes } from "@/lib/db/queries/search";
import { Button } from "@/components/ui";
import { getTagsWithRecipeCount } from "@/lib/db/queries/tags";
import { RecipeMosaic } from "@/components/home/recipe-mosaic";
import { RecipeCard } from "@/components/recipe/recipe-card";
import { CategoryPills } from "@/components/browse/category-pills";
import { ColourDot } from "@/components/recipe/recipe-colour";
import { SITE_OG_IMAGE } from "../site-url";
import { Link2, Minus, Plus, Timer } from "lucide-react";

const HOME_DESCRIPTION =
  "Create, organize, and share your favorite recipes with friends and family. Your personal digital cookbook for all your culinary creations.";

export const metadata: Metadata = {
  title: {
    absolute: "Kookboek - Your Personal Cookbook",
  },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "Kookboek - Your Personal Cookbook",
    description: HOME_DESCRIPTION,
    siteName: "Kookboek",
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kookboek - Your Personal Cookbook",
    description: HOME_DESCRIPTION,
    images: [SITE_OG_IMAGE.url],
  },
};

// Seven for the hero's wall, then a row of four below it.
const MOSAIC_SIZE = 6;
const NEW_ROW_SIZE = 4;
const CATEGORY_COUNT = 9;

/** The newest public recipes. The page still renders without them. */
async function getNewestRecipes(userId: string | undefined) {
  try {
    const { recipes } = await getPublicRecipes({}, MOSAIC_SIZE + NEW_ROW_SIZE, 0, userId);
    return recipes;
  } catch (error) {
    console.error("Home: could not load the newest recipes", error);
    return [];
  }
}

/** The busiest categories, or none if they can't be loaded. */
async function getBusiestCategories() {
  try {
    const tags = await getTagsWithRecipeCount();
    return tags
      .filter((tag) => tag.recipeCount > 0)
      .sort((a, b) => b.recipeCount - a.recipeCount)
      .slice(0, CATEGORY_COUNT);
  } catch (error) {
    console.error("Home: could not load categories", error);
    return [];
  }
}

const DEMO_ROW = "flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0";

// What the app does, in its own words, each with a small picture of itself.
const FEATURES = [
  {
    title: "Import from a photo or a link",
    body: "Snap a cookbook page or paste a recipe URL. The ingredients and steps land in the form for you to check.",
    demo: (
      <>
        <div className="flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-border px-3 text-muted-foreground">
          <Link2 className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">oma-kookt.nl/erwtensoep</span>
        </div>
        <div className={`${DEMO_ROW} mt-2`}>
          <span>Ingredients found</span>
          <b className="tabular">11</b>
        </div>
        <div className={DEMO_ROW}>
          <span>Steps found</span>
          <b className="tabular">6</b>
        </div>
      </>
    ),
  },
  {
    title: "Scale and convert",
    body: "Cooking for six instead of four? Amounts scale with the servings, and switch between metric and imperial units.",
    demo: (
      <>
        <div className="mb-1.5 flex items-center justify-between">
          <b>Serves</b>
          <span className="inline-flex h-11 items-center gap-3 rounded-full border-2 border-foreground px-3.5 font-bold">
            <Minus className="size-4" aria-hidden="true" />
            <span className="text-lg tabular">6</span>
            <Plus className="size-4" aria-hidden="true" />
          </span>
        </div>
        <div className={DEMO_ROW}>
          <span>Split peas</span>
          <b className="tabular">750 g</b>
        </div>
        <div className={DEMO_ROW}>
          <span>Leeks</span>
          <b className="tabular">3</b>
        </div>
      </>
    ),
  },
  {
    title: "One shopping list",
    body: "Add a recipe's ingredients in one tap. The same items from different recipes are combined into one line.",
    demo: (
      <>
        <div className={DEMO_ROW}>
          <span className="flex items-center gap-2">
            <span className="flex gap-1">
              <ColourDot seed="demo" tags={["vegetables"]} />
              <ColourDot seed="demo" tags={["pasta"]} />
            </span>
            Onions
          </span>
          <b className="tabular">5</b>
        </div>
        <div className={DEMO_ROW}>
          <span className="flex items-center gap-2">
            <ColourDot seed="demo" tags={["pasta"]} />
            Feta
          </span>
          <b className="tabular">200 g</b>
        </div>
        <div className={DEMO_ROW}>
          <span className="flex items-center gap-2">
            <span className="flex gap-1">
              <ColourDot seed="demo" tags={["vegetables"]} />
              <ColourDot seed="demo" tags={["soup"]} />
            </span>
            Carrots
          </span>
          <b className="tabular">6</b>
        </div>
      </>
    ),
  },
  {
    title: "Cook mode",
    body: "One step at a time in large type, with timers, and the screen stays on while you cook.",
    demo: (
      <div className="recipe-basil -m-4 rounded-2xl bg-recipe p-4 text-on-recipe">
        <p className="text-[13px] font-bold">Step 3 of 6</p>
        <p className="mt-2 mb-3.5 font-display text-3xl leading-[0.92]">
          Add the leeks and simmer until thick.
        </p>
        <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-on-recipe px-3 font-bold text-recipe tabular">
          <Timer className="size-4" aria-hidden="true" />
          45:00
        </span>
      </div>
    ),
  },
] as const;

export default async function HomePage() {
  // Signed-in visitors get a way back into their cookbook instead of sign-up
  // prompts. The main layout already resolves the session, so this page is
  // dynamic either way.
  const session = await auth.api.getSession({ headers: await headers() });
  const isSignedIn = !!session?.user;
  const [recipes, categories] = await Promise.all([
    getNewestRecipes(session?.user?.id),
    getBusiestCategories(),
  ]);
  const newRow = recipes.slice(MOSAIC_SIZE, MOSAIC_SIZE + NEW_ROW_SIZE);

  return (
    <div>
      {/* Hero: the thesis is the wall. Every recipe has a colour. */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-8 pb-16 sm:px-6 sm:pt-12 sm:pb-24 lg:grid-cols-[34rem_minmax(0,1fr)] lg:gap-14 lg:px-8">
        <div>
          <h1 className="font-display text-[5.75rem] leading-[0.84] text-foreground text-balance sm:text-[8rem] lg:text-[9.75rem]">
            Every recipe has a colour.
          </h1>
          <p className="mt-7 max-w-md text-xl leading-normal text-foreground">
            Kookboek keeps the recipes you actually cook in one place, ready to
            scale, shop for and share by link.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {isSignedIn ? (
              <Button asChild size="lg">
                <Link href="/recipes/new">Add a recipe</Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link href="/register">Start your cookbook</Link>
              </Button>
            )}
            <Button asChild variant="outline" size="lg">
              <Link href="/browse">Browse recipes</Link>
            </Button>
          </div>
          {isSignedIn && (
            <p className="mt-6 text-muted-foreground">
              Or pick up where you left off on your{" "}
              <Link
                href="/dashboard"
                className="font-bold text-primary underline decoration-2 underline-offset-4"
              >
                dashboard
              </Link>
              .
            </p>
          )}
        </div>

        <RecipeMosaic recipes={recipes.slice(0, MOSAIC_SIZE)} />
      </section>

      {/* What it does: four panels, each showing the thing itself. */}
      <section aria-labelledby="home-features" className="bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-22 lg:px-8">
          <h2 id="home-features" className="font-display text-5xl text-foreground sm:text-6xl">
            From the page to the pan
          </h2>
          <dl className="mt-8 grid gap-6 lg:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="grid items-center gap-6 rounded-3xl bg-background p-6 sm:grid-cols-[minmax(0,1fr)_16.5rem] sm:p-8"
              >
                <div>
                  <dt className="font-display text-4xl leading-[0.95] text-foreground">
                    {feature.title}
                  </dt>
                  <dd className="mt-3 text-muted-foreground">{feature.body}</dd>
                </div>
                {/* A picture of the feature, not a control. */}
                <div aria-hidden="true" className="rounded-2xl bg-card p-4 text-[15px] text-foreground">
                  {feature.demo}
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {(newRow.length > 0 || categories.length > 0) && (
        <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6 sm:space-y-22 sm:py-22 lg:px-8">
          {newRow.length > 0 && (
            <section aria-labelledby="home-new">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <h2 id="home-new" className="font-display text-5xl text-foreground sm:text-6xl">
                  Just added
                </h2>
                <Link
                  href="/browse"
                  className="inline-flex min-h-11 items-center font-bold text-primary underline decoration-2 underline-offset-4"
                >
                  Browse all recipes
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {newRow.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} showFavorite={false} headingLevel="h3" />
                ))}
              </div>
            </section>
          )}

          {categories.length > 0 && (
            <section aria-labelledby="home-categories">
              <h2 id="home-categories" className="mb-7 font-display text-5xl text-foreground sm:text-6xl">
                Pick by what&rsquo;s in it
              </h2>
              <CategoryPills tags={categories} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
