/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    // allow large bodies if needed
  },
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
