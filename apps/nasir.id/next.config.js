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
                hostname: 'assets.nasir.id',
            },
        ],
    },
    // Kept out of the server bundle (native binary). Top-level since
    // Next 15; it was experimental.serverComponentsExternalPackages before.
    serverExternalPackages: ['sharp'],
    experimental: {
        // Increase body parser limit for App Router
        serverActions: {
            bodySizeLimit: '50mb',
        },
    },
};

module.exports = nextConfig;
