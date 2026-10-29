/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages: no Next image optimizer (requires a Node runtime).
  images: { unoptimized: true },
};

export default nextConfig;
