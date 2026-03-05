import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Nasir Noor | Cloud & DevOps Engineer',
    description:
        'Cloud & DevOps engineer passionate about building resilient, scalable infrastructure and exploring AI/ML integration.',
    openGraph: {
        title: 'Nasir Noor | Cloud & DevOps Engineer',
        description:
            'Cloud & DevOps engineer passionate about building resilient, scalable infrastructure and exploring AI/ML integration.',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
