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
        const days = parseInt(searchParams.get('days') || '7');

        // Get recent visitors with location data
        const visitors = await sql`
            SELECT 
                visitor_ip,
                os,
                device_type,
                browser,
                country,
                city,
                visited_at
            FROM analytics
            WHERE visited_at >= NOW() - INTERVAL '1 day' * ${days}
                AND country IS NOT NULL
                AND city IS NOT NULL
            ORDER BY visited_at DESC
            LIMIT 50
        `;

        return NextResponse.json({ visitors });
    } catch (error) {
        console.error('Error fetching recent visitors:', error);
        return NextResponse.json({ error: 'Failed to fetch recent visitors' }, { status: 500 });
    }
}