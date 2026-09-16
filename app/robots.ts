import { MetadataRoute } from "next";
import { SITE_URL } from "./site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/recipes",
          "/favorites",
          "/profile",
          "/settings",
          // Password reset links can leak into referrers; keep crawlers out.
          "/forgot-password",
          "/reset-password",
          // Confirmation links carry a token and sign the person in.
          "/confirm-email",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
