import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.184.199.210",
    "10.184.199.210:3000",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;
