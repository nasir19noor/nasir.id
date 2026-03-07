import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { processImageUrls } from '@/lib/image-utils';

export async function GET() {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const articles = await sql`
      SELECT id, title, slug, summary, image_url, images, published_at, is_portfolio, language 
      FROM articles 
      ORDER BY published_at DESC
    `;
        
        // Process image URLs to use assets domain
        const processedArticles = articles.map(processImageUrls);
        
        return NextResponse.json(processedArticles);
    } catch (error) {
        console.error('Error fetching articles:', error);
        return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { title, slug, summary, content, image_url, images, is_portfolio, language } = await request.json();

        if (!title || !slug || !content) {
            return NextResponse.json(
                { error: 'Title, slug, and content are required' },
                { status: 400 }
            );
        }

        const imagesArray = Array.isArray(images) ? images : [];
        const articleLanguage = language || 'en'; // Default to 'en' if not provided

        const [article] = await sql`
      INSERT INTO articles (title, slug, summary, content, image_url, images, is_portfolio, language, published_at)
      VALUES (${title}, ${slug}, ${summary || ''}, ${content}, ${image_url || ''}, ${imagesArray}, ${is_portfolio || false}, ${articleLanguage}, NOW())
      RETURNING id, title, slug, summary, image_url, images, is_portfolio, language, published_at
    `;

        return NextResponse.json(article, { status: 201 });
    } catch (error) {
        console.error('Error creating article:', error);
        return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
    }
}
