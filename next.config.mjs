/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: [
      'bb8c-173-32-210-210.ngrok-free.app',
      '*.ngrok-free.app',
    ],
  },
}

export default nextConfig
