import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "http", hostname: "localhost", port: "5001" },
      { protocol: "https", hostname: "example.com" },
    ],
  },
};

export default nextConfig;
