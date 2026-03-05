import { NextResponse } from 'next/server';
import { trackVisit, parseUserAgent, getClientIp, getGeolocation } from '@/lib/analytics';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { pageUrl, pageType, articleId, articleSlug } = body;

        // Get visitor information
        const visitorIp = getClientIp(request);
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        const referrer = request.headers.get('referer') || request.headers.get('referrer') || undefined;

        // Parse user agent
        const { os, deviceType, browser } = parseUserAgent(userAgent);

        // Get geolocation (async, but don't wait for it to avoid slowing down the response)
        const geoPromise = getGeolocation(visitorIp);

        // Track visit with basic info first
        const analyticsData = {
            visitorIp,
            userAgent,
            os,
            deviceType,
            browser,
            pageUrl,
            pageType,
            articleId,
            articleSlug,
            referrer,
        };

        // Get geo data and track
        const geo = await geoPromise;
        await trackVisit({
            ...analyticsData,
            ...geo,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Analytics tracking error:', error);
        // Return success anyway - don't break the page if analytics fails
        return NextResponse.json({ success: true });
    }
}
