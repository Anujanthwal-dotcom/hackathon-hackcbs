import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@cura-health/contracts"],
  reactStrictMode: true,
};

export default nextConfig;
