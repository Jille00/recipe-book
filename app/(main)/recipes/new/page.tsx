import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RecipeForm } from "@/components/recipe/recipe-form";
import { getAllTags } from "@/lib/db/queries/tags";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "New recipe",
  description: "Add a new recipe to your collection",
  robots: { index: false, follow: false },
};

export default async function NewRecipePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/recipes/new")}`);
  }

  const tags = await getAllTags();
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 pb-8 sm:px-6 sm:pb-12 lg:px-8">
      <header className="mb-8 sm:mb-10">
        <Link
          href="/recipes"
          className="mb-3 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to recipes
        </Link>
        <h1 className="text-6xl leading-[0.88] text-foreground sm:text-7xl lg:text-8xl">
          New recipe
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Write it down once, and it&apos;s here every time you cook it.
        </p>
      </header>

      <RecipeForm tags={tags} />
    </div>
  );
}
