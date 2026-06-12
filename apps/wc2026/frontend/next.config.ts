import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'wc2026.nasir.id' },
      { protocol: 'https', hostname: 'api.wc2026.nasir.id' },
    ],
  },
}

export default nextConfig
