import type { Metadata } from "next";
import { headers } from "next/headers";
import { Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Toaster } from "@/components/ui";
import { UnitPreferencesProvider } from "@/contexts/unit-preferences-context";
import { SITE_OG_IMAGE, SITE_URL } from "./site-url";

// Self-hosted by next/font (no render-blocking request to Google). The
// variables feed --font-sans / --font-display in globals.css.
// Sofia Sans: everything you read and press.
const sofia = Sofia_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sofia",
});

// Sofia Sans Extra Condensed: titles, set large and tight like a crate label.
const sofiaCondensed = Sofia_Sans_Extra_Condensed({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sofia-condensed",
});

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the request makes every page render per request, which the CSP
  // nonce (proxy.ts) needs: a page prerendered at build time would carry no
  // nonce, and the browser would block its scripts.
  // The same nonce goes on next-themes' inline no-flash script, which the
  // CSP's script-src 'nonce-...' would otherwise block.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // suppressHydrationWarning: next-themes sets the theme class on <html>
    // before React hydrates, so the server markup never matches it.
    <html
      lang="en"
      className={`${sofia.variable} ${sofiaCondensed.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          <UnitPreferencesProvider>
            {children}
            <Toaster />
          </UnitPreferencesProvider>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
