import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isUuid } from "@/lib/api-utils";
import { getCollection, getCollectionRecipes } from "@/lib/db/queries/collections";
import { CollectionDetail } from "@/components/collections/collection-detail";

interface Props {
  params: Promise<{ id: string }>;
}

const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

// generateMetadata and the page share one lookup per request.
const findCollection = cache((id: string, userId: string) =>
  isUuid(id) ? getCollection(id, userId) : Promise.resolve(null)
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const session = await getSession();
  const found = session?.user ? await findCollection(id, session.user.id) : null;
  return {
    title: found?.name ?? "Collection",
    robots: { index: false, follow: false },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/collections/${id}`)}`);
  }

  // Someone else's collection is indistinguishable from a missing one.
  const found = await findCollection(id, session.user.id);
  if (!found) notFound();

  const recipes = await getCollectionRecipes(found.id, session.user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <CollectionDetail
        collection={{ id: found.id, name: found.name }}
        recipes={recipes}
        currentUserId={session.user.id}
      />
    </div>
  );
}
