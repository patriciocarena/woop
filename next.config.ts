import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Explicitly pin the workspace root to this project directory.
    // Prevents Turbopack from scanning parent/home folders when it finds
    // stray lockfiles outside the project, which would exhaust RAM.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
