import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the local Playwright server check to load development assets safely.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
