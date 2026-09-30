import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPublicRecipes } from "@/lib/db/queries/search";
import { Button } from "@/components/ui";
import { RecipeTileWall, type WallRecipe } from "@/components/home/recipe-tile-wall";
import { SITE_OG_IMAGE } from "../site-url";
import { Camera, ChefHat, Scale, ShoppingBasket } from "lucide-react";

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

const WALL_SIZE = 12;

/** The newest public recipes for the hero wall. The page still renders without them. */
async function getWallRecipes(userId: string | undefined): Promise<WallRecipe[]> {
  try {
    const { recipes } = await getPublicRecipes({}, WALL_SIZE, 0, userId);
    return recipes.map(({ code, slug, title, tags }) => ({ code, slug, title, tags }));
  } catch (error) {
    console.error("Home: could not load recipes for the tile wall", error);
    return [];
  }
}

// What the app does, in its own words. A plain list, not a feature grid.
const FEATURES = [
  {
    icon: Camera,
    title: "Import from a photo or a link",
    body: "Snap a cookbook page or paste a recipe URL. The ingredients and steps land in the form for you to check.",
  },
  {
    icon: Scale,
    title: "Scale and convert",
    body: "Cooking for six instead of four? Amounts scale with the servings, and switch between metric and imperial units.",
  },
  {
    icon: ShoppingBasket,
    title: "One shopping list",
    body: "Add a recipe's ingredients in one tap. The same items from different recipes are combined into one line.",
  },
  {
    icon: ChefHat,
    title: "Cook mode",
    body: "One step at a time in large type, with timers, and the screen stays on while you cook.",
  },
] as const;

export default async function HomePage() {
  // Signed-in visitors get a way back into their cookbook instead of sign-up
  // prompts. The main layout already resolves the session, so this page is
  // dynamic either way.
  const session = await auth.api.getSession({ headers: await headers() });
  const isSignedIn = !!session?.user;
  const wallRecipes = await getWallRecipes(session?.user?.id);

  return (
    <div>
      {/* Hero: the thesis is the wall. Every recipe gets its own tile. */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16 lg:px-8 lg:py-24">
        <div>
          <h1 className="font-display text-[3.5rem] leading-[1.02] tracking-[-0.02em] text-foreground text-balance sm:text-[4.5rem]">
            Every recipe gets its own tile.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
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
            <p className="mt-6 text-sm text-muted-foreground">
              Or pick up where you left off on your{" "}
              <Link
                href="/dashboard"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                dashboard
              </Link>
              .
            </p>
          )}
        </div>

        <RecipeTileWall recipes={wallRecipes} size={WALL_SIZE} columns={4} />
      </section>

      {/* What it does: four plain lines, divided like a recipe card. */}
      <section
        aria-labelledby="home-features"
        className="border-t border-border bg-card"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <h2 id="home-features" className="font-display text-[1.75rem] leading-tight text-foreground">
            From the page to the pan
          </h2>
          <dl className="mt-8 grid gap-x-12 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex gap-4 border-t border-border py-6"
              >
                <feature.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <dt className="font-medium text-foreground">{feature.title}</dt>
                  <dd className="mt-1 text-muted-foreground">{feature.body}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
