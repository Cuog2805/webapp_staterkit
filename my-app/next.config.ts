import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tạo .next/standalone: server.js + đúng phần node_modules cần thiết, để image Docker
  // production không phải mang theo toàn bộ node_modules.
  output: "standalone",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
