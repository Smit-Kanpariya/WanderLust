import type { NextConfig } from "next";

// Set STATIC_EXPORT_BASE_PATH (e.g. "/WanderLust") to build a fully static site for
// GitHub Pages or any static host. Without it, this is a normal Next.js build (Vercel).
const basePath = process.env.STATIC_EXPORT_BASE_PATH;

const nextConfig: NextConfig =
  basePath !== undefined
    ? {
        output: "export",
        basePath: basePath || undefined,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {};

export default nextConfig;
