import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

// GET /api/gallery - every recorded upload (Gallery, Articles, Portfolio),
// newest first. Backs the Gallery admin page instead of localStorage, so it
// reflects uploads made anywhere, not just ones made through Gallery itself
// in that specific browser.
export async function GET() {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const rows = await sql`
            SELECT url, name, size, uploaded_at
            FROM gallery_images
            ORDER BY uploaded_at DESC
        `;

        const images = rows.map((row) => ({
            url: row.url,
            name: row.name,
            size: Number(row.size) || 0,
            uploadedAt: row.uploaded_at,
        }));

        return NextResponse.json({ images });
    } catch (error) {
        console.error('Error fetching gallery images:', error);
        return NextResponse.json({ error: 'Failed to fetch gallery images' }, { status: 500 });
    }
}
