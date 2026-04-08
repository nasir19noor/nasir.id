import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getAnalyticsSummary, getPopularArticles, getVisitorStats, getVisitorDetails } from '@/lib/analytics';

export async function GET(request: Request) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '30');

        const [summary, popularArticles, visitorStats, visitorDetails] = await Promise.all([
            getAnalyticsSummary(days),
            getPopularArticles(10),
            getVisitorStats(days),
            getVisitorDetails(days, 100),
        ]);

        console.log('Analytics Stats:', {
            days,
            visitorStats,
            summaryCount: summary.length,
            popularCount: popularArticles.length,
            detailsCount: visitorDetails.length,
        });

        return NextResponse.json({
            summary,
            popularArticles,
            visitorStats,
            visitorDetails,
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
