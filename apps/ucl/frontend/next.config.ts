import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'a.espncdn.com' },
      { protocol: 'https', hostname: 'ucl.nasir.id' },
      { protocol: 'https', hostname: 'api.ucl.nasir.id' },
    ],
  },
}

export default nextConfig
