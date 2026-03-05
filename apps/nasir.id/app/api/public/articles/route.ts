import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        const articles = await sql`
            SELECT id, title, slug, summary, image_url, images, published_at 
            FROM articles 
            WHERE is_portfolio = FALSE
            ORDER BY published_at DESC 
            LIMIT 4
        `;
        return NextResponse.json(articles);
    } catch (error) {
        console.error('Error fetching public articles:', error);
        return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }
}
