import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isGithubActions ? '/oil-bench' : '',
};

export default nextConfig;
