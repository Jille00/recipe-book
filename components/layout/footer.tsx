"use client";

import Link from "next/link";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui";
import { Github } from "lucide-react";

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
  "text-sm text-muted-foreground transition-colors hover:text-primary";

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
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="Kookboek"
                width={96}
                height={96}
                className="h-12 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Your personal cookbook in the cloud. Create, organize, and share your
              favorite recipes with friends and family.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Navigation
            </h2>
            <nav aria-label="Footer navigation" className="mt-4 flex flex-col gap-2">
              <Link href="/" className={FOOTER_LINK}>
                Home
              </Link>
              <Link href="/browse" className={FOOTER_LINK}>
                Browse Recipes
              </Link>
            </nav>
          </div>

          {/* Account */}
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">
              Account
            </h2>
            <nav aria-label="Account" className="mt-4 flex flex-col gap-2">
              {!sessionResolved ? null : isSignedIn ? (
                <>
                  <Link href="/dashboard" className={FOOTER_LINK}>
                    Dashboard
                  </Link>
                  <Link href="/recipes" className={FOOTER_LINK}>
                    My Recipes
                  </Link>
                  <Link href="/profile" className={FOOTER_LINK}>
                    Profile
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className={FOOTER_LINK}>
                    Sign In
                  </Link>
                  <Link href="/register" className={FOOTER_LINK}>
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; <CopyrightYear /> Kookboek. Made with love for home cooks.
          </p>

          <div className="flex items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Kookboek on GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
