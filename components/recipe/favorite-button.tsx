"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
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
  initialFavorited,
  variant = "icon",
  size = "md",
  className,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited ?? false);
  const [isPending, setIsPending] = useState(false);

  // `isPending` only reaches the DOM on the next render, so it cannot stop a
  // second click fired in the same frame. A ref flips synchronously and does.
  const inFlightRef = useRef(false);
  // The last value we committed, read synchronously so each request rolls back
  // to the state it actually started from rather than a stale render closure.
  const favoritedRef = useRef(isFavorited);

  // Re-sync when the component is reused for another recipe (client-side
  // navigation) or the server sends a new value.
  useEffect(() => {
    const next = initialFavorited ?? false;
    favoritedRef.current = next;
    setIsFavorited(next);
  }, [recipeId, initialFavorited]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Serialise: never let a POST and a DELETE race for the same recipe.
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const previous = favoritedRef.current;
    const next = !previous;
    favoritedRef.current = next;
    setIsFavorited(next);
    setIsPending(true);

    try {
      const res = await fetch(`/api/favorites/${recipeId}`, {
        method: next ? "POST" : "DELETE",
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }
    } catch {
      favoritedRef.current = previous;
      setIsFavorited(previous);
      toast.error("Failed to update favorite");
    } finally {
      inFlightRef.current = false;
      setIsPending(false);
    }
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const label = isFavorited ? "Remove from favorites" : "Add to favorites";

  if (variant === "glass") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "flex items-center justify-center rounded-full glass p-2 transition-all hover:scale-110",
          isPending && "opacity-50",
          className
        )}
        aria-label={label}
        aria-pressed={isFavorited}
      >
        <Heart
          aria-hidden="true"
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
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        variant={isFavorited ? "default" : "outline"}
        size="sm"
        className={className}
        aria-pressed={isFavorited}
      >
        <Heart
          aria-hidden="true"
          className={cn("h-4 w-4", isFavorited && "fill-current")}
        />
        {isFavorited ? "Favorited" : "Favorite"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      variant="ghost"
      size="icon"
      className={cn("rounded-full", isPending && "opacity-50", className)}
      aria-label={label}
      aria-pressed={isFavorited}
    >
      <Heart
        aria-hidden="true"
        className={cn(
          iconSize,
          "transition-colors",
          isFavorited
            ? "fill-red-500 text-red-500"
            : "text-muted-foreground hover:text-foreground"
        )}
      />
    </Button>
  );
}
