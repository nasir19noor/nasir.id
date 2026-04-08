import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { processImageUrls } from '@/lib/image-utils';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const [article] = await sql`
      SELECT id, title, slug, summary, content, image_url, images, is_portfolio, language, published_at 
      FROM articles 
      WHERE id = ${parseInt(id)}
    `;

        if (!article) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Process image URLs to use assets domain
        const processedArticle = processImageUrls(article);

        return NextResponse.json(processedArticle);
    } catch (error) {
        console.error('Error fetching article:', error);
        return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: RouteParams) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { title, slug, summary, content, image_url, images, is_portfolio, language } = await request.json();

        const imagesArray = Array.isArray(images) ? images : [];
        const articleLanguage = language || 'en'; // Default to 'en' if not provided

        const [article] = await sql`
      UPDATE articles 
      SET title = ${title}, slug = ${slug}, summary = ${summary || ''}, content = ${content}, image_url = ${image_url || ''}, images = ${imagesArray}, is_portfolio = ${is_portfolio || false}, language = ${articleLanguage}
      WHERE id = ${parseInt(id)}
      RETURNING id, title, slug, summary, image_url, images, is_portfolio, language, published_at
    `;

        if (!article) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(article);
    } catch (error) {
        console.error('Error updating article:', error);
        return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const [article] = await sql`
      DELETE FROM articles WHERE id = ${parseInt(id)} RETURNING id
    `;

        if (!article) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting article:', error);
        return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
    }
}
