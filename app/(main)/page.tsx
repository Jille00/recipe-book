import Link from "next/link";
import { Button } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-white dark:from-neutral-900 dark:to-neutral-950">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-6xl">
              Your Personal
              <span className="block text-orange-600">Recipe Collection</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-neutral-600 dark:text-neutral-400">
              Create, organize, and share your favorite recipes. Keep all your
              culinary creations in one place and easily share them with friends
              and family.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg">Get Started Free</Button>
              </Link>
              <Link href="/categories">
                <Button variant="outline" size="lg">
                  Browse Recipes
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative background */}
        <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl">
          <div
            className="relative left-1/2 aspect-[1155/678] w-[72rem] -translate-x-1/2 bg-gradient-to-r from-orange-200 to-orange-400 opacity-20"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              Everything you need to manage your recipes
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600 dark:text-neutral-400">
              Simple, powerful tools to keep your recipes organized and
              accessible.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-2xl dark:bg-orange-900/30">
                📝
              </div>
              <h3 className="mt-6 text-lg font-semibold text-neutral-900 dark:text-white">
                Create Recipes
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Add your recipes with detailed ingredients, step-by-step
                instructions, and beautiful photos.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-2xl dark:bg-orange-900/30">
                📂
              </div>
              <h3 className="mt-6 text-lg font-semibold text-neutral-900 dark:text-white">
                Stay Organized
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Organize recipes by categories and tags. Quickly find what
                you&apos;re looking for with powerful search.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-2xl dark:bg-orange-900/30">
                🔗
              </div>
              <h3 className="mt-6 text-lg font-semibold text-neutral-900 dark:text-white">
                Share Easily
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Generate shareable links for your recipes. Share with friends,
                family, or on social media.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-2xl dark:bg-orange-900/30">
                ❤️
              </div>
              <h3 className="mt-6 text-lg font-semibold text-neutral-900 dark:text-white">
                Save Favorites
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Bookmark your favorite recipes for quick access. Build your
                personal collection of go-to dishes.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-2xl dark:bg-orange-900/30">
                🔍
              </div>
              <h3 className="mt-6 text-lg font-semibold text-neutral-900 dark:text-white">
                Quick Search
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Find recipes instantly with full-text search. Filter by
                category, tags, or difficulty level.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-2xl dark:bg-orange-900/30">
                📱
              </div>
              <h3 className="mt-6 text-lg font-semibold text-neutral-900 dark:text-white">
                Access Anywhere
              </h3>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400">
                Use on any device. Your recipes are always with you, whether in
                the kitchen or at the store.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-orange-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Start your recipe collection today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-orange-100">
              Join thousands of home cooks who use Recipe Book to organize and
              share their culinary creations.
            </p>
            <div className="mt-8">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-white text-orange-600 hover:bg-orange-50"
                >
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
