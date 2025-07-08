/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: [
      '*.ngrok-free.app',
    ],
  },
}

export default nextConfig
