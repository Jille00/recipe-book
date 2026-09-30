import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserCollections } from "@/lib/db/queries/collections";
import { CollectionsGrid } from "@/components/collections/collections-grid";

export const metadata: Metadata = {
  title: "Collections",
  description: "Your recipe collections",
  robots: { index: false, follow: false },
};

export default async function CollectionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/collections")}`);
  }

  const collections = await getUserCollections(session.user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CollectionsGrid
        initialCollections={collections.map(({ id, name, recipeCount, coverImageUrl }) => ({
          id,
          name,
          recipeCount,
          coverImageUrl,
        }))}
      />
    </div>
  );
}
