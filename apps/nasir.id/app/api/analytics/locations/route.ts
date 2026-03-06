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

        // Get location data with visit counts
        const locations = await sql`
            SELECT 
                latitude,
                longitude,
                country,
                city,
                COUNT(*) as visit_count,
                COUNT(DISTINCT visitor_ip) as unique_visitors,
                MAX(visited_at) as last_visit
            FROM analytics
            WHERE visited_at >= NOW() - INTERVAL '1 day' * ${days}
                AND latitude IS NOT NULL 
                AND longitude IS NOT NULL
            GROUP BY latitude, longitude, country, city
            ORDER BY visit_count DESC
        `;

        return NextResponse.json({ locations });
    } catch (error) {
        console.error('Error fetching location data:', error);
        return NextResponse.json({ error: 'Failed to fetch location data' }, { status: 500 });
    }
}