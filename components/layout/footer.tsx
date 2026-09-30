"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui";
import { Github } from "lucide-react";
import { BrandMark } from "./brand-mark";

const GITHUB_URL = "https://github.com/Jille00/recipe-book";

/** The year never changes while the page is open, so nothing to subscribe to. */
const subscribeToNothing = () => () => {};
const getCurrentYear = () => new Date().getFullYear();

/**
 * On a prerendered page a server-rendered `new Date()` freezes at build time.
 * Reading the year as a client snapshot keeps the footer correct however the
 * page was rendered, without a hydration mismatch.
 */
function CopyrightYear() {
  const year = useSyncExternalStore(
    subscribeToNothing,
    getCurrentYear,
    getCurrentYear
  );

  return <>{year}</>;
}

const FOOTER_LINK =
  "inline-flex min-h-11 items-center text-sm text-muted-foreground transition-colors duration-150 hover:text-primary md:min-h-9";

// Column labels: Hanken eyebrow, not Gloock (they are not titles).
const FOOTER_HEADING =
  "font-sans text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground";

interface FooterProps {
  /**
   * Whether the server saw a session. Lets the account links render correctly
   * on the first paint; the client session takes over once it resolves (so
   * signing out updates the footer too). Omit it where no session is at hand.
   */
  initialSignedIn?: boolean;
}

export function Footer({ initialSignedIn }: FooterProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const hasServerValue = initialSignedIn !== undefined;
  const sessionResolved = !isLoading || hasServerValue;
  const isSignedIn =
    isLoading && hasServerValue ? !!initialSignedIn : isAuthenticated;

  return (
    <footer className="border-t border-border bg-card print:hidden">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <BrandMark />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              A cookbook for the recipes you actually make. Keep them in one
              place and share them by link.
            </p>
          </div>

          <div>
            <h2 className={FOOTER_HEADING}>Recipes</h2>
            <nav aria-label="Footer navigation" className="mt-3 flex flex-col">
              <Link href="/" className={FOOTER_LINK}>
                Home
              </Link>
              <Link href="/browse" className={FOOTER_LINK}>
                Browse recipes
              </Link>
              <Link href="/tags" className={FOOTER_LINK}>
                Categories
              </Link>
            </nav>
          </div>

          <div>
            <h2 className={FOOTER_HEADING}>Account</h2>
            <nav aria-label="Account" className="mt-3 flex flex-col">
              {!sessionResolved ? null : isSignedIn ? (
                <>
                  <Link href="/dashboard" className={FOOTER_LINK}>
                    Dashboard
                  </Link>
                  <Link href="/recipes" className={FOOTER_LINK}>
                    My recipes
                  </Link>
                  <Link href="/profile" className={FOOTER_LINK}>
                    Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className={FOOTER_LINK}>
                    Sign in
                  </Link>
                  <Link href="/register" className={FOOTER_LINK}>
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; <span className="font-mono tabular"><CopyrightYear /></span>{" "}
            Kookboek. Made for home cooks.
          </p>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-primary"
          >
            <Github className="size-5" aria-hidden="true" />
            <span className="sr-only">Kookboek on GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
