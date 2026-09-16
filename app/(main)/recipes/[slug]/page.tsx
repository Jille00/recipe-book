import { redirect, notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getRecipeBySlug } from "@/lib/db/queries/recipes";
import { recipePath } from "@/lib/recipe-url";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * The old owner-only recipe URL. Every recipe now has a single address that
 * works for everyone, so this only exists to keep bookmarks working.
 *
 * Slugs are unique per owner rather than globally, which is why this has to
 * look the recipe up for the signed-in user before it can redirect.
 */
export default async function LegacyOwnerRecipePage({ params }: Props) {
  const { slug } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/recipes/${slug}`)}`);
  }

  const recipe = await getRecipeBySlug(session.user.id, slug);

  if (!recipe) {
    notFound();
  }

  // Temporary rather than permanent: which recipe a slug means depends on who
  // is signed in.
  redirect(recipePath(recipe));
}
