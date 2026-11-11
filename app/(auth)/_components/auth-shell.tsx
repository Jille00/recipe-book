import type { ReactNode } from "react";
import { RECIPE_COLOURS, hashSeed } from "@/lib/recipe-colour";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";
import {
  AUTH_PANEL_ATTRIBUTION_TEXT,
  AUTH_PANEL_QUOTE_TEXT,
  AUTH_PANEL_SURFACE,
} from "./auth-panel-classes";

interface AuthShellProps {
  /** Seed for this page's wall of colours, so each page has its own. */
  seed: string;
  /** Kept for the pages' call sites; the wall is seeded, not tagged. */
  tags?: readonly string[];
  quote: string;
  author: string;
  /** Which side the wall sits on at desktop widths. */
  panelSide?: "left" | "right";
  children: ReactNode;
}

/**
 * Sign-in, sign-up and the email/password pages: the form on the leek page,
 * and beside it (from lg up) a wall of recipe colours with a quote on an
 * opaque card. Below lg the wall shrinks to a strip above the form.
 */
export function AuthShell({ seed, quote, author, panelSide = "right", children }: AuthShellProps) {
  // Nine blocks in a seeded order: the same page always shows the same wall.
  const offset = hashSeed(seed) % RECIPE_COLOURS.length;
  const wall = RECIPE_COLOURS.map((_, index) => RECIPE_COLOURS[(index * 4 + offset) % RECIPE_COLOURS.length]);

  return (
    <div className={cn("flex min-h-screen flex-col lg:flex-row", panelSide === "left" && "lg:flex-row-reverse")}>
      <div data-colour-wall="" aria-hidden="true" className="flex h-4 lg:hidden">
        {wall.map((colour) => (
          <span key={colour} className={cn(`recipe-${colour}`, "flex-1 bg-recipe")} />
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <BrandMark />
          {children}
        </div>
      </div>

      <div className="relative hidden flex-1 bg-ink lg:block dark:bg-card">
        <div
          data-colour-wall=""
          aria-hidden="true"
          className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-3.5 p-7"
        >
          {wall.map((colour) => (
            <span key={colour} className={cn(`recipe-${colour}`, "rounded-[18px] bg-recipe")} />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <figure
            className={cn(
              "max-w-md rounded-3xl p-8 shadow-lifted",
              AUTH_PANEL_SURFACE
            )}
          >
            <blockquote>
              <p className={cn("font-display text-5xl leading-[0.95] text-balance", AUTH_PANEL_QUOTE_TEXT)}>
                &ldquo;{quote}&rdquo;
              </p>
            </blockquote>
            <figcaption className={cn("mt-4 font-semibold", AUTH_PANEL_ATTRIBUTION_TEXT)}>
              {author}
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}

interface AuthHeadingProps {
  title: string;
  description: string;
  /** Optional status icon above the title (confirm-email). */
  icon?: ReactNode;
}

/** Title block under the mark: a condensed h1, one plain line below. */
export function AuthHeading({ title, description, icon }: AuthHeadingProps) {
  return (
    <div className="mb-8 mt-10">
      {icon}
      <h1 className={cn("font-display text-7xl leading-[0.88] text-foreground text-balance", icon && "mt-4")}>
        {title}
      </h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
