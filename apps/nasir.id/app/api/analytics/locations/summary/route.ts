import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import sql from '@/lib/db';

export async function GET(request: Request) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');
        const type = searchParams.get('type') || 'country';

        let data;

        if (type === 'country') {
            data = await sql`
                SELECT 
                    country,
                    COUNT(*) as visit_count,
                    COUNT(DISTINCT visitor_ip) as unique_visitors
                FROM analytics
                WHERE visited_at >= NOW() - INTERVAL '1 day' * ${days}
                    AND country IS NOT NULL
                GROUP BY country
                ORDER BY visit_count DESC
                LIMIT 20
            `;
        } else {
            data = await sql`
                SELECT 
                    city,
                    country,
                    COUNT(*) as visit_count,
                    COUNT(DISTINCT visitor_ip) as unique_visitors
                FROM analytics
                WHERE visited_at >= NOW() - INTERVAL '1 day' * ${days}
                    AND city IS NOT NULL
                    AND country IS NOT NULL
                GROUP BY city, country
                ORDER BY visit_count DESC
                LIMIT 20
            `;
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Error fetching location summary:', error);
        return NextResponse.json({ error: 'Failed to fetch location summary' }, { status: 500 });
    }
}