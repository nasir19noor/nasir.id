/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
            {
                protocol: 'https',
                hostname: 's3.ap-southeast-1.amazonaws.com',
            },
            {
                protocol: 'https',
                hostname: process.env.ASSETS_DOMAIN?.replace('https://', '') || 'assets.nasir.id',
            },
        ],
    },
    // Increase body size limit for file uploads
    experimental: {
        serverComponentsExternalPackages: ['sharp'],
        // Increase body parser limit for App Router
        serverActions: {
            bodySizeLimit: process.env.MAX_UPLOAD_SIZE || '50mb',
        },
    },
};

module.exports = nextConfig;
