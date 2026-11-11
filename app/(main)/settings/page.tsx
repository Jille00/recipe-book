import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowRight, User } from "lucide-react";
import { auth } from "@/lib/auth";
import { ChangePasswordCard } from "@/components/account/change-password-card";
import { ChangeEmailCard } from "@/components/account/change-email-card";
import { SessionsCard } from "@/components/account/sessions-card";
import { ExportDataCard } from "@/components/account/export-data-card";
import { DeleteAccountCard } from "@/components/account/delete-account-card";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Kookboek sign-in, data and account",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/settings")}`);
  }

  // Only a count is shown; a failure just hides it.
  const sessionCount = await auth.api
    .listSessions({ headers: headersList })
    .then((sessions) => sessions.length)
    .catch(() => null);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-8 sm:mb-10">
        <h1 className="text-6xl leading-[0.88] text-foreground sm:text-7xl lg:text-8xl">
          Account
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Your sign-in details, your data, and your account.
        </p>
        <Link
          href="/profile"
          className="group mt-3 inline-flex min-h-11 items-center gap-2 font-bold text-foreground underline decoration-2 underline-offset-4 hover:decoration-[3px] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <User className="size-4" aria-hidden="true" />
          Name, bio and units are on your profile
          <ArrowRight
            className="size-4 transition-transform duration-(--duration-fast) group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </header>

      <div className="space-y-6">
        <ChangeEmailCard
          currentEmail={session.user.email}
          emailVerified={session.user.emailVerified}
        />
        <ChangePasswordCard />
        <SessionsCard sessionCount={sessionCount} />
        <ExportDataCard />
      </div>

      {/* Kept apart from the everyday settings, so it isn't reached by
          accident. */}
      <div className="mt-12">
        <DeleteAccountCard />
      </div>
    </div>
  );
}
