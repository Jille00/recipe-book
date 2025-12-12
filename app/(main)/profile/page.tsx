import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getProfileByUserId } from "@/lib/db/queries/profile";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata = {
  title: "Profile - Kookboek",
  description: "Manage your profile and preferences",
};

export default async function ProfilePage() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getProfileByUserId(session.user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Profile
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile and preferences
        </p>
      </div>

      <ProfileForm user={session.user} profile={profile} />
    </div>
  );
}
