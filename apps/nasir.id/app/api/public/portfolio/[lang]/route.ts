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

        const projects = await sql`
            SELECT id, title as project_title, content as description, image_url, images, slug, published_at 
            FROM articles
            WHERE is_portfolio = TRUE AND language = ${lang}
            ORDER BY published_at DESC
        `;
        
        // Process image URLs to use assets domain
        const processedProjects = projects.map(processImageUrls);
        
        return NextResponse.json(processedProjects);
    } catch (error) {
        console.error('Error fetching public portfolio:', error);
        return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
    }
}