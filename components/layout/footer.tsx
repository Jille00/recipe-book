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

// The footer is an aubergine band by day and a card-coloured one at night, so
// its text is leek (or the night foreground) rather than the page's ink.
const FOOTER_LINK =
  "inline-flex min-h-11 items-center text-base text-leek/75 underline-offset-4 transition-colors duration-150 hover:text-leek hover:underline dark:text-muted-foreground dark:hover:text-foreground";

// Column labels: Sofia Sans Bold, not the display face (they are not titles).
const FOOTER_HEADING = "font-sans text-base leading-normal font-bold";

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
    <footer className="bg-ink text-leek print:hidden dark:bg-card dark:text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <BrandMark
              wordmarkClassName="text-6xl sm:text-7xl"
              className="focus-visible:ring-leek focus-visible:ring-offset-ink"
            />
            <p className="mt-5 max-w-sm text-leek/75 dark:text-muted-foreground">
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

        <Separator className="my-8 bg-leek/20 dark:bg-border" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-leek/75 dark:text-muted-foreground">
            &copy; <span className="tabular"><CopyrightYear /></span>{" "}
            Kookboek. Made for home cooks.
          </p>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-11 items-center justify-center rounded-full text-leek/75 transition-colors duration-150 hover:bg-leek/15 hover:text-leek dark:text-muted-foreground dark:hover:text-foreground"
          >
            <Github className="size-5" aria-hidden="true" />
            <span className="sr-only">Kookboek on GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
