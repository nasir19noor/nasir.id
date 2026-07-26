import type { Metadata } from 'next';
import { Suspense } from 'react';
import PortfolioClient from './PortfolioClient';

const baseUrl = 'https://nasir.id';

export const metadata: Metadata = {
    title: 'Portfolio & Projects | Nasir.id',
    description:
        'Cloud infrastructure, DevOps automation, and innovative solutions that drive business transformation and technical excellence.',
    alternates: {
        canonical: `${baseUrl}/portfolio`,
        languages: {
            'en-US': `${baseUrl}/portfolio`,
            'id-ID': `${baseUrl}/id/portfolio`,
        },
    },
    openGraph: {
        title: 'Portfolio & Projects | Nasir.id',
        description:
            'Cloud infrastructure, DevOps automation, and innovative solutions that drive business transformation and technical excellence.',
        url: `${baseUrl}/portfolio`,
        siteName: 'Nasir.id',
        type: 'website',
        locale: 'en_US',
    },
};

export default function PortfolioPage() {
    return (
        <Suspense>
            <PortfolioClient />
        </Suspense>
    );
}
