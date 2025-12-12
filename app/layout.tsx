import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Toaster } from "@/components/ui";
import { UnitPreferencesProvider } from "@/contexts/unit-preferences-context";

export const metadata: Metadata = {
  title: "Kookboek - Your Personal Cookbook",
  description: "Create, organize, and share your favorite recipes with friends and family.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased grain">
        <UnitPreferencesProvider>
          {children}
          <Toaster />
        </UnitPreferencesProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
