import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RecipeForm } from "@/components/recipe/recipe-form";
import { getAllTags } from "@/lib/db/queries/tags";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Create Recipe",
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
          className="-ml-1 mb-3 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-medium text-muted-foreground transition-colors duration-(--duration-fast) hover:text-primary"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to recipes
        </Link>
        <h1 className="text-4xl leading-[1.1] tracking-[-0.01em] text-foreground sm:text-[44px]">
          New recipe
        </h1>
        <p className="mt-2 text-muted-foreground">
          Write it down once, and it&apos;s here every time you cook it.
        </p>
      </header>

      <RecipeForm tags={tags} />
    </div>
  );
}
