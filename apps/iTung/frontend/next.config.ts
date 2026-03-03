import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.itung.nasir.id' },
      { protocol: 'https', hostname: 'assets.itung.nasir.id' },
    ],
  },
}

export default nextConfig
