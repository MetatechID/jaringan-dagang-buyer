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
    const bapUrl = process.env.NEXT_PUBLIC_BAP_API_URL || "http://localhost:8002";
    return [
      {
        source: "/bap/:path*",
        destination: `${bapUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
