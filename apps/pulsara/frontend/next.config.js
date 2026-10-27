/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.pulsara.nasir.id',
  },
  // remotePatterns replaces the deprecated `domains` (Next 16).
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'threads.net' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
    ],
  },
  output: 'standalone',
}

module.exports = nextConfig