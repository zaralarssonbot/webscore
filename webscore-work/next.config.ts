import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app lives in a subfolder of a larger repo; pin the workspace root
  // so Turbopack doesn't pick up the parent lockfile.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
