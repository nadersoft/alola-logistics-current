/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: { unoptimized: true },
  // Dev server (.next) and prod build/start (.next-prod) share the working dir;
  // split the dist dir so `next dev -p 3101` and `next start -p 3001` can run together.
  distDir: process.env.NODE_ENV === 'production' ? '.next-prod' : '.next',
};

module.exports = nextConfig;
