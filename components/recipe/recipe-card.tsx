import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui";
import type { RecipeWithDetails } from "@/types/recipe";

interface RecipeCardProps {
  recipe: RecipeWithDetails;
  href?: string;
  showAuthor?: boolean;
}

export function RecipeCard({ recipe, href, showAuthor = false }: RecipeCardProps) {
  const link = href || `/recipes/${recipe.slug}`;
  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <Link href={link} className="group">
      <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white transition-all hover:shadow-lg hover:border-orange-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-700">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
          {recipe.image_url ? (
            <Image
              src={recipe.image_url}
              alt={recipe.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-5xl">
              🍽️
            </div>
          )}
          {recipe.difficulty && (
            <Badge
              variant={
                recipe.difficulty === "easy"
                  ? "success"
                  : recipe.difficulty === "medium"
                  ? "warning"
                  : "danger"
              }
              className="absolute top-3 right-3"
            >
              {recipe.difficulty}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-neutral-900 dark:text-white line-clamp-1 group-hover:text-orange-600">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
              {recipe.description}
            </p>
          )}

          {/* Meta */}
          <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {totalTime} min
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {recipe.servings} servings
              </span>
            )}
          </div>

          {/* Category & Author */}
          <div className="mt-3 flex items-center justify-between">
            {recipe.category_name && (
              <Badge variant="secondary">{recipe.category_name}</Badge>
            )}
            {showAuthor && recipe.author_name && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                by {recipe.author_name}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
