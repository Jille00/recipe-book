import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kookboek - Your Personal Cookbook",
    short_name: "Kookboek",
    description:
      "Create, organize, and share your favorite recipes with friends and family.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffcf8",
    theme_color: "#c75d3a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Separate artwork with the safe-zone padding Android crops into.
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
