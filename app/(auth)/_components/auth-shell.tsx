import type { ReactNode } from "react";
import { DelftWall } from "@/components/delft/delft-tile";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";
import {
  AUTH_PANEL_ATTRIBUTION_TEXT,
  AUTH_PANEL_QUOTE_TEXT,
  AUTH_PANEL_SURFACE,
} from "./auth-panel-classes";

interface AuthShellProps {
  /** Seed for this page's tile wall, so each page has its own wall. */
  seed: string;
  /** Picks the wall's motif (see lib/delft-tile.ts). */
  tags: readonly string[];
  quote: string;
  author: string;
  /** Which side the wall sits on at desktop widths. */
  panelSide?: "left" | "right";
  children: ReactNode;
}

/**
 * Sign-in, sign-up and the email/password pages: the form on porcelain, and
 * beside it (from lg up) a Delft tile wall with a quote on an opaque card.
 * Below lg the wall shrinks to a strip above the form.
 */
export function AuthShell({ seed, tags, quote, author, panelSide = "right", children }: AuthShellProps) {
  return (
    <div className={cn("flex min-h-screen flex-col lg:flex-row", panelSide === "left" && "lg:flex-row-reverse")}>
      <div className="h-16 border-b border-border lg:hidden">
        <DelftWall seed={seed} tags={tags} tileSize={64} />
      </div>

      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <BrandMark />
          {children}
        </div>
      </div>

      <div
        className={cn(
          "relative hidden flex-1 border-border lg:block",
          panelSide === "left" ? "lg:border-r" : "lg:border-l"
        )}
      >
        <DelftWall seed={seed} tags={tags} tileSize={120} className="absolute inset-0" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <figure
            className={cn(
              "max-w-md rounded-xl border border-border p-8 shadow-lifted",
              AUTH_PANEL_SURFACE
            )}
          >
            <blockquote>
              <p className={cn("font-display text-3xl leading-[1.2]", AUTH_PANEL_QUOTE_TEXT)}>
                &ldquo;{quote}&rdquo;
              </p>
            </blockquote>
            <figcaption className={cn("mt-4 text-sm", AUTH_PANEL_ATTRIBUTION_TEXT)}>
              — {author}
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

/** Title block under the mark: Gloock H1-ish size, one plain line below. */
export function AuthHeading({ title, description, icon }: AuthHeadingProps) {
  return (
    <div className="mb-8 mt-10">
      {icon}
      <h1 className={cn("font-display text-[2.25rem] leading-[1.1] tracking-[-0.01em] text-foreground text-balance", icon && "mt-4")}>
        {title}
      </h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
  );
}
