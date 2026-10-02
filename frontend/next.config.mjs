import { createRequire } from "node:module";

const { version } = createRequire(import.meta.url)("./package.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
    NEXT_PUBLIC_RELEASE_COMMIT: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_RELEASE_COMMIT || "",
  },
  async redirects() {
    // Preserve installed clients' old media URLs before static-file lookup.
    return ["lesson-assets", "audio-cache", "sfx", "course-audio"].map((tree) => ({
      source: `/${tree}/:path*`,
      destination: `https://cdn.learnspanglish.app/${tree}/:path*`,
      permanent: false,
    }));
  },
  async headers() {
    return [
      {
        source: "/lesson-assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/audio-cache/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/spanglish-logo.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
