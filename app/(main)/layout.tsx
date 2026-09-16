import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve the session here so the header renders the correct state on the
  // very first paint instead of flashing "Log In / Sign Up" at signed-in users.
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  return (
    <div className="flex min-h-screen flex-col">
      <Header initialUser={session?.user ?? null} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
