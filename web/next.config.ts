import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* One self-contained server in .next/standalone, for Docker or a plain VPS. */
  output: "standalone",
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
