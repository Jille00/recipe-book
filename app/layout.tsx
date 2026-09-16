import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui";
import { UnitPreferencesProvider } from "@/contexts/unit-preferences-context";
import { SITE_OG_IMAGE, SITE_URL } from "./site-url";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kookboek - Your Personal Cookbook",
    template: "%s | Kookboek",
  },
  description:
    "Create, organize, and share your favorite recipes with friends and family. Your personal digital cookbook for all your culinary creations.",
  keywords: [
    "recipes",
    "cookbook",
    "cooking",
    "recipe organizer",
    "meal planning",
    "food",
    "recipe sharing",
  ],
  authors: [{ name: "Kookboek" }],
  creator: "Kookboek",
  // Site-wide fallback only. Next.js replaces the whole `openGraph` object
  // when a route declares its own, so every page sets its own title and url.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Kookboek",
    title: "Kookboek - Your Personal Cookbook",
    description:
      "Create, organize, and share your favorite recipes with friends and family.",
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kookboek - Your Personal Cookbook",
    description:
      "Create, organize, and share your favorite recipes with friends and family.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
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
        <Analytics />
      </body>
    </html>
  );
}
