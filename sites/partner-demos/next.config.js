/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Beli Aman SDK ships TypeScript source — Next must transpile it.
  transpilePackages: ["@jaringan-dagang/beli-aman-sdk"],
  experimental: {
    typedRoutes: false,
  },
};
module.exports = nextConfig;
