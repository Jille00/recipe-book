import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    // Slugs renamed when accent transliteration was fixed: the old generator
    // stripped accented letters ("Ragù" became "rag") instead of transliterating
    // them. Both recipes were public and in the sitemap, so the old URLs are
    // kept alive with permanent redirects rather than left to 404.
    const renamedSlugs: Array<[from: string, to: string]> = [
      [
        "classic-beef-bolognese-rag-alla-bolognese",
        "classic-beef-bolognese-ragu-alla-bolognese",
      ],
      [
        "chicken-normande-kip-la-normande",
        "chicken-normande-kip-a-la-normande",
      ],
    ];

    return renamedSlugs.flatMap(([from, to]) => [
      { source: `/r/${from}`, destination: `/r/${to}`, permanent: true },
      { source: `/recipes/${from}`, destination: `/recipes/${to}`, permanent: true },
      {
        source: `/recipes/${from}/edit`,
        destination: `/recipes/${to}/edit`,
        permanent: true,
      },
    ]);
  },
};

export default nextConfig;
