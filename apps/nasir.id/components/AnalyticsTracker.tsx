'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface AnalyticsTrackerProps {
    pageType: string;
    articleId?: number;
    articleSlug?: string;
}

export default function AnalyticsTracker({ pageType, articleId, articleSlug }: AnalyticsTrackerProps) {
    const pathname = usePathname();

    useEffect(() => {
        // Track page view
        const trackPageView = async () => {
            try {
                await fetch('/api/analytics/track', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        pageUrl: window.location.href,
                        pageType,
                        articleId,
                        articleSlug,
                    }),
                });
            } catch (error) {
                // Silently fail - don't break the page
                console.debug('Analytics tracking failed:', error);
            }
        };

        trackPageView();
    }, [pathname, pageType, articleId, articleSlug]);

    return null; // This component doesn't render anything
}
