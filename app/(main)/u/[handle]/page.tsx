import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, ChefHat, Globe, MapPin, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  Pagination,
} from "@/components/ui";
import { RecipeCard } from "@/components/recipe/recipe-card";
import {
  getPublicProfileByHandle,
  getPublicRecipesByUser,
} from "@/lib/db/queries/public-profiles";
import { parseBrowsePage } from "@/lib/browse-params";
import { HANDLE_PATTERN, profilePath } from "@/lib/handle";
import { profileDescription, websiteLink } from "@/lib/public-profile";
import { SITE_OG_IMAGE } from "../../../site-url";

const PAGE_SIZE = 12;

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}

// generateMetadata and the page run in the same request; Drizzle calls are
// not deduped by Next, so cache them per request.
const getProfile = cache((handle: string) => getPublicProfileByHandle(handle));
const getRecipes = cache(
  (authorId: string, page: number, viewerId: string | undefined) =>
    getPublicRecipesByUser(authorId, PAGE_SIZE, (page - 1) * PAGE_SIZE, viewerId)
);
const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
);

/** Anything that can't be a handle is a 404 without touching the database. */
function isPlausibleHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle.toLowerCase());
}

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { handle } = await params;
  const page = parseBrowsePage((await searchParams).page);
  const profile = isPlausibleHandle(handle) ? await getProfile(handle) : null;

  if (!profile) {
    return { title: "Profile Not Found", robots: { index: false, follow: false } };
  }

  const session = await getSession();
  const { total } = await getRecipes(profile.userId, page, session?.user?.id);
  const path = profilePath(profile.handle);
  const canonical = page > 1 ? `${path}?page=${page}` : path;
  const title =
    page > 1
      ? `${profile.name} (@${profile.handle}) - Page ${page}`
      : `${profile.name} (@${profile.handle})`;
  const description = profileDescription(profile.name, profile.bio, total);

  return {
    title,
    description,
    alternates: { canonical },
    // A profile with nothing public on it is a thin page: reachable, but not
    // worth indexing (and the sitemap leaves it out for the same reason).
    robots: total === 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "profile",
      url: canonical,
      title: `${title} | Kookboek`,
      description,
      siteName: "Kookboek",
      username: profile.handle,
      images: profile.image ? [{ url: profile.image }] : [SITE_OG_IMAGE],
    },
    twitter: {
      card: "summary",
      title: `${title} | Kookboek`,
      description,
      images: profile.image ? [profile.image] : [SITE_OG_IMAGE.url],
    },
  };
}

export default async function PublicProfilePage({ params, searchParams }: Props) {
  const { handle } = await params;
  if (!isPlausibleHandle(handle)) notFound();

  const profile = await getProfile(handle);
  if (!profile) notFound();

  const rawPage = (await searchParams).page;
  const requestedPage = parseBrowsePage(rawPage);

  // One address per profile: /u/Jille lands on /u/jille.
  if (handle !== profile.handle) {
    permanentRedirect(
      requestedPage > 1
        ? `${profilePath(profile.handle)}?page=${requestedPage}`
        : profilePath(profile.handle)
    );
  }

  const session = await getSession();
  const viewerId = session?.user?.id;
  const { recipes, total } = await getRecipes(profile.userId, requestedPage, viewerId);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // "?page=99" past the end goes to the last page that has recipes.
  if (requestedPage > totalPages) {
    redirect(
      totalPages > 1
        ? `${profilePath(profile.handle)}?page=${totalPages}`
        : profilePath(profile.handle)
    );
  }

  const isOwner = viewerId === profile.userId;
  const website = websiteLink(profile.website);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Profile header */}
      <section
        aria-labelledby="profile-name"
        className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start"
      >
        <Avatar className="h-24 w-24 shrink-0 border border-border">
          {/* Decorative: the name is the heading right next to it. */}
          <AvatarImage src={profile.image || undefined} alt="" />
          <AvatarFallback className="bg-primary/10 text-2xl font-medium text-primary">
            {initials(profile.name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1
                id="profile-name"
                className="font-display text-3xl font-semibold tracking-tight text-foreground break-words"
              >
                {profile.name}
              </h1>
              <p className="mt-1 text-muted-foreground">@{profile.handle}</p>
            </div>
            {isOwner && (
              <Button asChild variant="outline" size="sm">
                <Link href="/profile">
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit profile
                </Link>
              </Button>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-lg leading-7 text-foreground">
              {profile.bio}
            </p>
          )}

          <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {profile.location && (
              <li className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Location: </span>
                {profile.location}
              </li>
            )}
            {website && (
              <li className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Website: </span>
                <a
                  href={website.href}
                  // User-supplied link: no ranking credit, no window.opener.
                  rel="nofollow ugc noopener"
                  target="_blank"
                  className="inline-flex min-h-11 items-center break-all font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline sm:min-h-0"
                >
                  {website.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            )}
            {profile.createdAt && (
              <li className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Joined {format(profile.createdAt, "MMMM yyyy")}
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* Public recipes */}
      <section aria-labelledby="profile-recipes">
        <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-4">
          <h2 id="profile-recipes" className="font-display text-2xl font-semibold text-foreground">
            Recipes
          </h2>
          <p className="text-sm text-muted-foreground">
            {total} public recipe{total === 1 ? "" : "s"}
            {requestedPage > 1 && ` (page ${requestedPage} of ${totalPages})`}
          </p>
        </div>

        {recipes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <ChefHat className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="font-display text-xl font-semibold text-foreground">
                No public recipes yet
              </p>
              <p className="mt-2 max-w-md text-muted-foreground">
                {isOwner
                  ? "Recipes you make public will show up here for everyone to see."
                  : `${profile.name} hasn't shared any recipes publicly yet.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  showFavorite={!!viewerId}
                  initialFavorited={recipe.isFavorited}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination
                  currentPage={requestedPage}
                  totalPages={totalPages}
                  baseUrl={profilePath(profile.handle)}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
