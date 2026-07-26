import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { processImageUrls } from '@/lib/image-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
    try {
        const { lang } = await params;

        // Validate language parameter
        if (!['en', 'id'].includes(lang)) {
            return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
        }

        // BlogSection (homepage teaser) passes ?limit=4; the full /articles
        // listing page omits it to get everything. This used to be a
        // hardcoded LIMIT 4 shared by both, silently capping the listing
        // page at 4 articles regardless of how many were actually published.
        const requestedLimit = parseInt(request.nextUrl.searchParams.get('limit') || '', 10);
        const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
            ? Math.min(requestedLimit, 100)
            : 100;

        const articles = await sql`
            SELECT id, title, slug, summary, image_url, images, tags, published_at
            FROM articles
            WHERE is_portfolio = FALSE AND language = ${lang}
            ORDER BY published_at DESC
            LIMIT ${limit}
        `;
        
        // Process image URLs to use assets domain
        const processedArticles = articles.map(processImageUrls);
        
        return NextResponse.json(processedArticles);
    } catch (error) {
        console.error('Error fetching public articles:', error);
        return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }
}