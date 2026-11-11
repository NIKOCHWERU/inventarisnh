const path = require('path');

// Allow custom BASE_PATH (defaults to /inventaris-nh for public domain hosting)
const rawBasePath = process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : '/inventaris-nh';
const basePath = rawBasePath === '/' || !rawBasePath ? '' : (rawBasePath.startsWith('/') ? rawBasePath : `/${rawBasePath}`);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  basePath: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
};

module.exports = nextConfig;
