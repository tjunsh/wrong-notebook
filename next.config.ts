import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.sql$/i,
      resourceQuery: /raw/,
      type: 'asset/source',
    })

    return config
  },
};

export default nextConfig;
