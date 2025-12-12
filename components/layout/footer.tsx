import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <span className="font-semibold text-neutral-900 dark:text-white">
              Recipe Book
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6">
            <Link
              href="/"
              className="text-sm text-neutral-600 hover:text-orange-600 dark:text-neutral-400"
            >
              Home
            </Link>
            <Link
              href="/categories"
              className="text-sm text-neutral-600 hover:text-orange-600 dark:text-neutral-400"
            >
              Categories
            </Link>
            <Link
              href="/search"
              className="text-sm text-neutral-600 hover:text-orange-600 dark:text-neutral-400"
            >
              Search
            </Link>
          </nav>

          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            &copy; {new Date().getFullYear()} Recipe Book. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
