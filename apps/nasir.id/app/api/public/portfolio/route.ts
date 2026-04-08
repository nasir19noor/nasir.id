import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { processImageUrls } from '@/lib/image-utils';

export async function GET() {
    try {
        const projects = await sql`
            SELECT id, title as project_title, content as description, image_url, images, slug, published_at 
            FROM articles 
            WHERE is_portfolio = TRUE
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
