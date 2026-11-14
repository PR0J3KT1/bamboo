import type { NextConfig } from "next";

/* Photos are served from the R2 bucket's public address (R2_PUBLIC_URL), resized by next/image. */
const photoHost = (() => {
  try {
    return process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL) : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: photoHost ? [{ protocol: photoHost.protocol.replace(":", "") as "http" | "https", hostname: photoHost.hostname, port: photoHost.port, pathname: "/**" }] : [],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    /* photos are shrunk in the browser to about 0.5 MB before upload; this leaves room */
    serverActions: { bodySizeLimit: "4mb" },
  },
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
