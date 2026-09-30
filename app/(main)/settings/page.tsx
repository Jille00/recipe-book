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
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Account</h1>
          <p className="mt-1 text-muted-foreground">
            Your sign-in details, your data, and your account
          </p>
        </div>
        <Link
          href="/profile"
          className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <User className="h-4 w-4" aria-hidden="true" />
          Name, bio and units are on your profile
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>

      <div className="space-y-6">
        <ChangeEmailCard
          currentEmail={session.user.email}
          emailVerified={session.user.emailVerified}
        />
        <ChangePasswordCard />
        <SessionsCard sessionCount={sessionCount} />
        <ExportDataCard />
        <DeleteAccountCard />
      </div>
    </div>
  );
}
