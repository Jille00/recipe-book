import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/db/queries/profile";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your profile and preferences",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/profile")}`);
  }

  const profile = await getProfileByUserId(session.user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-8 sm:mb-10">
        <h1 className="text-6xl leading-[0.88] text-foreground sm:text-7xl lg:text-8xl">
          Profile
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          How you appear to others, and how recipes are measured for you.
        </p>
        <Link
          href="/settings"
          className="group mt-3 inline-flex min-h-11 items-center gap-2 font-bold text-foreground underline decoration-2 underline-offset-4 hover:decoration-[3px] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Settings className="size-4" aria-hidden="true" />
          Email, password and account
          <ArrowRight
            className="size-4 transition-transform duration-(--duration-fast) group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </header>

      <ProfileForm user={session.user} profile={profile} />
    </div>
  );
}
