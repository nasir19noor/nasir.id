import type { Metadata } from 'next';
import PortfolioClientID from './PortfolioClientID';

const baseUrl = 'https://nasir.id';

export const metadata: Metadata = {
    title: 'Portfolio & Proyek | Nasir.id',
    description:
        'Infrastruktur cloud, otomasi DevOps, dan solusi inovatif yang mendorong transformasi bisnis dan keunggulan teknis.',
    alternates: {
        canonical: `${baseUrl}/id/portfolio`,
        languages: {
            'en-US': `${baseUrl}/portfolio`,
            'id-ID': `${baseUrl}/id/portfolio`,
        },
    },
    openGraph: {
        title: 'Portfolio & Proyek | Nasir.id',
        description:
            'Infrastruktur cloud, otomasi DevOps, dan solusi inovatif yang mendorong transformasi bisnis dan keunggulan teknis.',
        url: `${baseUrl}/id/portfolio`,
        siteName: 'Nasir.id',
        type: 'website',
        locale: 'id_ID',
    },
};

export default function PortfolioPageID() {
    return <PortfolioClientID />;
}
