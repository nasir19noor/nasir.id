import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { processImageUrls } from '@/lib/image-utils';

export async function GET() {
    try {
        const articles = await sql`
            SELECT id, title, slug, summary, image_url, images, published_at 
            FROM articles 
            WHERE is_portfolio = FALSE
            ORDER BY published_at DESC 
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
