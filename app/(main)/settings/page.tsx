import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your Kookboek account settings and preferences",
  robots: { index: false, follow: false },
};

// Redirect /settings to /profile
export default function SettingsPage() {
  redirect("/profile");
}
