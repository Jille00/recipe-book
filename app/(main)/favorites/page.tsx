import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { PageHeader } from "@/components/page/page-header";
import { EmptyState } from "@/components/page/empty-state";
import { auth } from "@/lib/auth";
import { getUserFavorites } from "@/lib/db/queries/favorites";
import { FavoritesGrid } from "./favorites-grid";

export const metadata: Metadata = {
  title: "Favorites",
  description: "View your favorite recipes",
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/favorites")}`);
  }

  const favorites = await getUserFavorites(session.user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <PageHeader
        title="Favorites"
        intro="The recipes you've hearted, ready when you are."
      />

      <FavoritesGrid
        recipes={favorites}
        currentUserId={session.user.id}
        emptyState={
          <EmptyState
            seed="favorites-empty"
            tags={["desserts"]}
            title="No favorites yet"
            action={
              <Button asChild>
                <Link href="/browse">Browse recipes</Link>
              </Button>
            }
          >
            Tap the heart on any recipe to keep it here for quick access.
          </EmptyState>
        }
      />
    </div>
  );
}
