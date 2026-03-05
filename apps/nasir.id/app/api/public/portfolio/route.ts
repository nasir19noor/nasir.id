import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
    try {
        const projects = await sql`
            SELECT id, title as project_title, content as description, image_url, images, slug, published_at 
            FROM articles 
            WHERE is_portfolio = TRUE
            ORDER BY published_at DESC
        `;
        return NextResponse.json(projects);
    } catch (error) {
        console.error('Error fetching public portfolio:', error);
        return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
    }
}
