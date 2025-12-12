import { redirect } from "next/navigation";

// Redirect /settings to /profile
export default function SettingsPage() {
  redirect("/profile");
}
