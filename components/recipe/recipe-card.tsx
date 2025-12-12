import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui";
import type { RecipeWithDetails } from "@/types/recipe";
import { Clock, Users, ChefHat } from "lucide-react";

interface RecipeCardProps {
  recipe: RecipeWithDetails;
  href?: string;
  showAuthor?: boolean;
}

export function RecipeCard({ recipe, href, showAuthor = false }: RecipeCardProps) {
  const link = href || `/recipes/${recipe.slug}`;
  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  const getDifficultyVariant = (difficulty: string | null) => {
    switch (difficulty) {
      case "easy":
        return "secondary";
      case "medium":
        return "outline";
      case "hard":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <Link href={link} className="group block">
      <article className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {recipe.imageUrl ? (
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ChefHat className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}

          {/* Time Badge - Glass Effect */}
          {totalTime > 0 && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full glass px-2.5 py-1 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              {totalTime} min
            </div>
          )}

          {/* Difficulty Badge */}
          {recipe.difficulty && (
            <Badge
              variant={getDifficultyVariant(recipe.difficulty)}
              className="absolute top-3 right-3 capitalize"
            >
              {recipe.difficulty}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-display font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {recipe.title}
          </h3>

          {recipe.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
              {recipe.description}
            </p>
          )}

          {/* Meta */}
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {recipe.servings} servings
              </span>
            )}
          </div>

          {/* Author */}
          {showAuthor && recipe.authorName && (
            <div className="mt-3">
              <span className="text-xs text-muted-foreground">
                by {recipe.authorName}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
