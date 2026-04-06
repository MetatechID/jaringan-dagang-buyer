/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/bap/:path*",
        destination: "http://localhost:8002/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
