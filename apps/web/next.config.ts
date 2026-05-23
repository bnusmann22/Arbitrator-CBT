import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@arbitration/types'],
  reactStrictMode: true,
};

export default nextConfig;
