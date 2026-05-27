import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
      },
    ],
  },
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    '.space-z.ai',
  ],
};

export default nextConfig;
