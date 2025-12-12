"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  recipeId: string;
  initialFavorited?: boolean;
  variant?: "icon" | "button" | "glass";
  size?: "sm" | "md";
  className?: string;
}

export function FavoriteButton({
  recipeId,
  initialFavorited = false,
  variant = "icon",
  size = "md",
  className,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newState = !isFavorited;
    setIsFavorited(newState);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/favorites/${recipeId}`, {
          method: newState ? "POST" : "DELETE",
        });

        if (!res.ok) {
          setIsFavorited(!newState);
        }
      } catch {
        setIsFavorited(!newState);
      }
    });
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  if (variant === "glass") {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "flex items-center justify-center rounded-full glass p-2 transition-all hover:scale-110",
          isPending && "opacity-50",
          className
        )}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart
          className={cn(
            iconSize,
            "transition-colors",
            isFavorited ? "fill-red-500 text-red-500" : "text-foreground"
          )}
        />
      </button>
    );
  }

  if (variant === "button") {
    return (
      <Button
        onClick={handleToggle}
        disabled={isPending}
        variant={isFavorited ? "default" : "outline"}
        size="sm"
        className={className}
      >
        <Heart
          className={cn(
            "h-4 w-4",
            isFavorited && "fill-current"
          )}
        />
        {isFavorited ? "Favorited" : "Favorite"}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={isPending}
      variant="ghost"
      size="icon"
      className={cn(
        "rounded-full",
        isPending && "opacity-50",
        className
      )}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={cn(
          iconSize,
          "transition-colors",
          isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-foreground"
        )}
      />
    </Button>
  );
}
