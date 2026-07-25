import type { Metadata } from 'next';
import ArticlesClient from './ArticlesClient';

const baseUrl = 'https://nasir.id';

export const metadata: Metadata = {
    title: 'Articles & Insights | Nasir.id',
    description:
        'Thoughts on cloud architecture, DevOps best practices, and emerging technologies shaping the future of software engineering.',
    alternates: {
        canonical: `${baseUrl}/articles`,
        languages: {
            'en-US': `${baseUrl}/articles`,
            'id-ID': `${baseUrl}/id/articles`,
        },
    },
    openGraph: {
        title: 'Articles & Insights | Nasir.id',
        description:
            'Thoughts on cloud architecture, DevOps best practices, and emerging technologies shaping the future of software engineering.',
        url: `${baseUrl}/articles`,
        siteName: 'Nasir.id',
        type: 'website',
        locale: 'en_US',
    },
};

export default function ArticlesPage() {
    return <ArticlesClient />;
}
