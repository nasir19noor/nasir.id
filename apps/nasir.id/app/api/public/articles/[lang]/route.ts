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

        const articles = await sql`
            SELECT a.id, at.title, at.slug, at.summary, a.image_url, a.images, a.published_at 
            FROM articles a
            JOIN article_translations at ON a.id = at.article_id
            WHERE a.is_portfolio = FALSE AND at.language = ${lang}
            ORDER BY a.published_at DESC 
            LIMIT 4
        `;
        
        // Process image URLs to use assets domain
        const processedArticles = articles.map(processImageUrls);
        
        return NextResponse.json(processedArticles);
    } catch (error) {
        console.error('Error fetching public articles:', error);
        return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }
}