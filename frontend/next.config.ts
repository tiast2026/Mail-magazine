import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Mail-magazine",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
