import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui";
import { UnitPreferencesProvider } from "@/contexts/unit-preferences-context";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.kookboek.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Kookboek",
    title: "Kookboek - Your Personal Cookbook",
    description:
      "Create, organize, and share your favorite recipes with friends and family.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kookboek - Your Personal Cookbook",
      },
    ],
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
