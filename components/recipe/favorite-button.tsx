"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { compactButtonClass, compactLabelClass } from "./action-styles";

type FavoriteChangeHandler = (recipeId: string, favorited: boolean) => void;

/**
 * Lets a list react to favorites changing inside cards it does not render
 * itself (RecipeCard renders its own FavoriteButton). The favorites page uses
 * it to drop a recipe from the list as soon as it is unfavorited.
 */
const FavoriteChangeContext = createContext<FavoriteChangeHandler | null>(null);

export const FavoriteChangeProvider = FavoriteChangeContext.Provider;

interface FavoriteButtonProps {
  recipeId: string;
  initialFavorited?: boolean;
  variant?: "icon" | "button" | "glass";
  size?: "sm" | "md";
  className?: string;
  /** "button" variant only: icon-only below `sm` (the recipe page's action row). */
  compact?: boolean;
  /** Called once the server has confirmed the new state. */
  onChange?: (favorited: boolean) => void;
}

export function FavoriteButton({
  recipeId,
  initialFavorited,
  variant = "icon",
  size = "md",
  className,
  compact = false,
  onChange,
}: FavoriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const onListChange = useContext(FavoriteChangeContext);
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

    let confirmed = false;
    try {
      const res = await fetch(`/api/favorites/${recipeId}`, {
        method: next ? "POST" : "DELETE",
      });

      if (res.status === 401) {
        // Signed out (or the session expired): sign in, then come back here.
        favoritedRef.current = previous;
        setIsFavorited(previous);
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!res.ok) {
        throw new Error("Request failed");
      }
      confirmed = true;
    } catch {
      favoritedRef.current = previous;
      setIsFavorited(previous);
      toast.error("Failed to update favorite");
    } finally {
      inFlightRef.current = false;
      setIsPending(false);
    }

    if (confirmed) {
      onChange?.(next);
      onListChange?.(recipeId, next);
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
          // 44px touch target (style guide: medium control height).
          "flex h-11 w-11 items-center justify-center rounded-full glass transition-all hover:scale-110",
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
            isFavorited ? "fill-danger text-danger dark:fill-danger-light dark:text-danger-light" : "text-foreground"
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
        // Outline either way: oranje belongs to the page's main action. The
        // filled heart shows the state.
        variant="outline"
        size={compact ? "default" : "sm"}
        className={cn(compact && compactButtonClass, className)}
        aria-pressed={isFavorited}
      >
        <Heart
          aria-hidden="true"
          className={cn(
            "h-4 w-4 transition-colors",
            isFavorited &&
              "fill-danger text-danger dark:fill-danger-light dark:text-danger-light"
          )}
        />
        <span className={cn(compact && compactLabelClass)}>
          {isFavorited ? "Favorited" : "Favorite"}
        </span>
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
      // 44px touch target (style guide: medium control height).
      className={cn("size-11 rounded-full", isPending && "opacity-50", className)}
      aria-label={label}
      aria-pressed={isFavorited}
    >
      <Heart
        aria-hidden="true"
        className={cn(
          iconSize,
          "transition-colors",
          isFavorited
            ? "fill-danger text-danger dark:fill-danger-light dark:text-danger-light"
            : "text-muted-foreground hover:text-foreground"
        )}
      />
    </Button>
  );
}
