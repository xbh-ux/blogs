import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      const ignoredWatcherPaths = [
        "**/.next/**",
        "**/node_modules/**",
        "**/.playwright-cli/**",
        "**/output/**",
        "**/crawl-output/**",
        "**/.claude/**",
        "**/dev-*.log",
        "**/claude-debug*.log",
        "**/ref-home.html",
        "**/tsconfig.tsbuildinfo",
      ];

      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: ignoredWatcherPaths,
      };
    }

    return config;
  },
};

export default nextConfig;
