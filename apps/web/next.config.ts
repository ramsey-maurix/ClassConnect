import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@classconnect/ui"],
  poweredByHeader: false,
  async rewrites() {
    const apiOrigin = process.env.API_PROXY_ORIGIN
      ?? (process.env.VERCEL ? "https://classconnect-mo0n.onrender.com" : undefined);
    if (!apiOrigin) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
