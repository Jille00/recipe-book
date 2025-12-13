import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";
import {
  ChefHat,
  BookOpen,
  Share2,
  Heart,
  Search,
  Smartphone,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const features = [
    {
      icon: ChefHat,
      title: "Create Recipes",
      description:
        "Add your recipes with detailed ingredients, step-by-step instructions, and beautiful photos.",
    },
    {
      icon: BookOpen,
      title: "Stay Organized",
      description:
        "Organize recipes by categories and tags. Quickly find what you're looking for with powerful search.",
    },
    {
      icon: Share2,
      title: "Share Easily",
      description:
        "Generate shareable links for your recipes. Share with friends, family, or on social media.",
    },
    {
      icon: Heart,
      title: "Save Favorites",
      description:
        "Bookmark your favorite recipes for quick access. Build your personal collection of go-to dishes.",
    },
    {
      icon: Search,
      title: "Quick Search",
      description:
        "Find recipes instantly with full-text search. Filter by category, tags, or difficulty level.",
    },
    {
      icon: Smartphone,
      title: "Access Anywhere",
      description:
        "Use on any device. Your recipes are always with you, whether in the kitchen or at the store.",
    },
  ];

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/10 to-background" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-6">
              <ChefHat className="h-4 w-4 text-primary" />
              Your culinary journey starts here
            </div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Your Personal
              <span className="block text-primary">Recipe Collection</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Create, organize, and share your favorite recipes. Keep all your
              culinary creations in one place and easily share them with friends
              and family.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="outline" size="lg">
                  Browse Recipes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Everything you need to manage your recipes
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Simple, powerful tools to keep your recipes organized and
              accessible.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 font-display text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-primary py-16">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl">
              Start your recipe collection today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
              Join thousands of home cooks who use Kookboek to organize and
              share their culinary creations.
            </p>
            <div className="mt-8">
              <Link href="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-background text-foreground hover:bg-background/90"
                >
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
