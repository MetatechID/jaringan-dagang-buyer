/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Beli Aman SDK ships TypeScript source — Next must transpile it.
  transpilePackages: ["@jaringan-dagang/beli-aman-sdk"],
  experimental: {
    typedRoutes: false,
  },
  env: {
    // Surface the build's git SHA to the client tracker so every event is
    // tagged with the exact storefront version that emitted it. Vercel sets
    // VERCEL_GIT_COMMIT_SHA at build time; on local dev it's "dev".
    NEXT_PUBLIC_VERSION_SHA:
      process.env.NEXT_PUBLIC_VERSION_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      "dev",
  },
};
module.exports = nextConfig;
