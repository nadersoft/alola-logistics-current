/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  // على Vercel يجب أن يكون .next، محلياً نستخدم .next-prod للإنتاج
  distDir: process.env.VERCEL ? '.next' : (process.env.NODE_ENV === 'production' ? '.next-prod' : '.next'),
};

module.exports = nextConfig;
