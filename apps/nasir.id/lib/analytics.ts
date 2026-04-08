import sql from './db';

interface AnalyticsData {
    visitorIp: string;
    userAgent: string;
    os: string;
    deviceType: string;
    browser: string;
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    pageUrl: string;
    pageType: string;
    articleId?: number;
    articleSlug?: string;
    referrer?: string;
}

// Parse User Agent to extract OS, device type, and browser
export function parseUserAgent(userAgent: string): {
    os: string;
    deviceType: string;
    browser: string;
} {
    const ua = userAgent.toLowerCase();

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac os x')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    // Detect Device Type
    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        deviceType = 'tablet';
    }

    // Detect Browser
    let browser = 'Unknown';
    if (ua.includes('edg/')) browser = 'Edge';
    else if (ua.includes('chrome/')) browser = 'Chrome';
    else if (ua.includes('firefox/')) browser = 'Firefox';
    else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

    return { os, deviceType, browser };
}

// Get IP from request headers (handles proxies)
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    if (realIp) {
        return realIp;
    }
    
    return 'unknown';
}

// Get geolocation from IP using ip-api.com (free, no API key needed)
export async function getGeolocation(ip: string): Promise<{
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
}> {
    // Skip for localhost/private IPs
    if (ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return {};
    }

    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,lat,lon`, {
            signal: AbortSignal.timeout(3000), // 3 second timeout
        });

        if (!response.ok) {
            return {};
        }

        const data = await response.json();

        if (data.status === 'success') {
            return {
                country: data.country,
                city: data.city,
                latitude: data.lat,
                longitude: data.lon,
            };
        }
    } catch (error) {
        console.error('Geolocation lookup failed:', error);
    }

    return {};
}

// Track page visit
export async function trackVisit(data: AnalyticsData): Promise<void> {
    try {
        await sql`
            INSERT INTO analytics (
                visitor_ip, user_agent, os, device_type, browser,
                country, city, latitude, longitude,
                page_url, page_type, article_id, article_slug, referrer, visited_at
            ) VALUES (
                ${data.visitorIp}, ${data.userAgent}, ${data.os}, ${data.deviceType}, ${data.browser},
                ${data.country || null}, ${data.city || null}, ${data.latitude || null}, ${data.longitude || null},
                ${data.pageUrl}, ${data.pageType}, ${data.articleId || null}, ${data.articleSlug || null}, 
                ${data.referrer || null}, NOW()
            )
        `;
    } catch (error) {
        console.error('Failed to track visit:', error);
        // Don't throw - analytics should not break the app
    }
}

// Get analytics summary
export async function getAnalyticsSummary(days: number = 30) {
    try {
        const summary = await sql`
            SELECT 
                DATE(visited_at) as date,
                COUNT(*) as total_visits,
                COUNT(DISTINCT visitor_ip) as unique_visitors,
                COUNT(CASE WHEN page_type = 'article' THEN 1 END) as article_views,
                COUNT(CASE WHEN page_type = 'portfolio' THEN 1 END) as portfolio_views,
                COUNT(CASE WHEN device_type = 'mobile' THEN 1 END) as mobile_visits,
                COUNT(CASE WHEN device_type = 'desktop' THEN 1 END) as desktop_visits
            FROM analytics
            WHERE visited_at >= NOW() - INTERVAL '1 day' * ${days}
            GROUP BY DATE(visited_at)
            ORDER BY date DESC
        `;
        return summary;
    } catch (error) {
        console.error('Failed to get analytics summary:', error);
        return [];
    }
}

// Get popular articles
export async function getPopularArticles(limit: number = 10) {
    try {
        const articles = await sql`
            SELECT * FROM popular_articles
            LIMIT ${limit}
        `;
        return articles;
    } catch (error) {
        console.error('Failed to get popular articles:', error);
        return [];
    }
}

// Get visitor stats
export async function getVisitorStats(days: number = 7) {
    try {
        const stats = await sql`
            SELECT 
                COUNT(*)::int as total_visits,
                COUNT(DISTINCT visitor_ip)::int as unique_visitors,
                COUNT(DISTINCT CASE WHEN device_type = 'mobile' THEN visitor_ip END)::int as mobile_visitors,
                COUNT(DISTINCT CASE WHEN device_type = 'desktop' THEN visitor_ip END)::int as desktop_visitors,
                COUNT(CASE WHEN page_type = 'article' THEN 1 END)::int as article_views,
                COUNT(CASE WHEN page_type = 'portfolio' THEN 1 END)::int as portfolio_views
            FROM analytics
            WHERE visited_at >= NOW() - INTERVAL '1 day' * ${days}
        `;
        return stats[0] || {};
    } catch (error) {
        console.error('Failed to get visitor stats:', error);
        return {};
    }
}

// Get detailed visitor records
export async function getVisitorDetails(days: number = 7, limit: number = 100) {
    try {
        const details = await sql`
            SELECT 
                id,
                visitor_ip,
                os,
                device_type,
                browser,
                country,
                city,
                page_type,
                article_slug,
                referrer,
                visited_at
            FROM analytics
            WHERE visited_at >= NOW() - INTERVAL '1 day' * ${days}
            ORDER BY visited_at DESC
            LIMIT ${limit}
        `;
        return details;
    } catch (error) {
        console.error('Failed to get visitor details:', error);
        return [];
    }
}
