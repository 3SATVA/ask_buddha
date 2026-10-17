import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: {
    "/api/ask": ["./BUDDHA_PROMPT.md"],
    "/api/iap/verify": ["./certs/AppleRootCA-G2.cer", "./certs/AppleRootCA-G3.cer"],
  },
  serverExternalPackages: ["@apple/app-store-server-library", "google-auth-library"],
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
