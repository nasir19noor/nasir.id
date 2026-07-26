import type { Metadata } from 'next';
import { Suspense } from 'react';
import ArticlesClientID from './ArticlesClientID';

const baseUrl = 'https://nasir.id';

export const metadata: Metadata = {
    title: 'Artikel & Wawasan | Nasir.id',
    description:
        'Pemikiran tentang arsitektur cloud, praktik terbaik DevOps, dan teknologi emerging yang membentuk masa depan rekayasa perangkat lunak.',
    alternates: {
        canonical: `${baseUrl}/id/articles`,
        languages: {
            'en-US': `${baseUrl}/articles`,
            'id-ID': `${baseUrl}/id/articles`,
        },
    },
    openGraph: {
        title: 'Artikel & Wawasan | Nasir.id',
        description:
            'Pemikiran tentang arsitektur cloud, praktik terbaik DevOps, dan teknologi emerging yang membentuk masa depan rekayasa perangkat lunak.',
        url: `${baseUrl}/id/articles`,
        siteName: 'Nasir.id',
        type: 'website',
        locale: 'id_ID',
    },
};

export default function ArticlesPageID() {
    return (
        <Suspense>
            <ArticlesClientID />
        </Suspense>
    );
}
