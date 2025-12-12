import Link from "next/link";
import { Separator } from "@/components/ui";
import { ChefHat, Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ChefHat className="h-5 w-5" />
              </div>
              <span className="font-display text-xl font-semibold text-foreground">
                Recipe Book
              </span>
            </Link>
            <p className="mt-4 max-w-md text-sm text-muted-foreground">
              Your personal cookbook in the cloud. Create, organize, and share your
              favorite recipes with friends and family.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-display font-semibold text-foreground">Navigation</h3>
            <nav className="mt-4 flex flex-col gap-2">
              <Link
                href="/"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Home
              </Link>
              <Link
                href="/categories"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Categories
              </Link>
              <Link
                href="/search"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Search Recipes
              </Link>
            </nav>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-display font-semibold text-foreground">Account</h3>
            <nav className="mt-4 flex flex-col gap-2">
              <Link
                href="/login"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Sign Up
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Recipe Book. Made with love for home cooks.
          </p>

          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
