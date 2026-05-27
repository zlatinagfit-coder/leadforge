import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix turbopack workspace root warning (multiple lockfiles up the tree)
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Vercel build hint — Prisma client needs special handling
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
