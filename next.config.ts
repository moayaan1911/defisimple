import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.lighthouse.storage',
        port: '',
        pathname: '/ipfs/**',
      },
    ],
  },
};

export default nextConfig;
