/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  distDir: process.env.VERCEL ? '.next' : (process.env.NODE_ENV === 'production' ? '.next-prod' : '.next'),
  ...(process.env.VERCEL ? {} : { output: 'standalone' }),
};

module.exports = nextConfig;
