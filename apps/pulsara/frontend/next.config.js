/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.pulsara.nasir.id',
  },
  images: {
    domains: ['threads.net', 'scontent.cdninstagram.com'],
  },
  output: 'standalone',
}

module.exports = nextConfig