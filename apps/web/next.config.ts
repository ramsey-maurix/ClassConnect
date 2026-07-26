import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@classconnect/ui"],
  poweredByHeader: false,
  async rewrites() {
    const apiOrigin = process.env.API_PROXY_ORIGIN;
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
