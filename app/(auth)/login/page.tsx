import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your Kookboek account",
  alternates: { canonical: "/login" },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="Kookboek"
                width={96}
                height={96}
                className="h-12 w-auto"
              />
            </Link>
            <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account to continue cooking
            </p>
          </div>

          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/10" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg text-center">
            <p className="font-display text-4xl font-semibold text-foreground/80">
              &ldquo;Cooking is like love. It should be entered into with abandon or
              not at all.&rdquo;
            </p>
            <p className="mt-4 text-muted-foreground">— Harriet Van Horne</p>
          </div>
        </div>
      </div>
    </div>
  );
}
