import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { convertToAssetsUrl, getThumbnailUrl } from '@/lib/image-utils';

export async function GET() {
  try {
    // Get the latest article to debug
    const results = await sql`
      SELECT id, title, slug, image_url, images, published_at
      FROM articles 
      WHERE is_portfolio = FALSE
      ORDER BY published_at DESC 
      LIMIT 1
    `;

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'No articles found' }, { status: 404 });
    }

    const article = results[0];
    
    const debugInfo = {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        published_at: article.published_at
      },
      raw_data: {
        image_url: article.image_url,
        images: article.images,
        images_type: typeof article.images,
        images_is_array: Array.isArray(article.images),
        images_length: article.images ? article.images.length : 0
      },
      processed_urls: {
        converted_image_url: article.image_url ? convertToAssetsUrl(article.image_url) : null,
        converted_images: article.images ? article.images.map(convertToAssetsUrl) : null,
        thumbnail_from_image_url: article.image_url ? getThumbnailUrl(article.image_url) : null,
        thumbnail_from_first_image: (article.images && article.images.length > 0) ? getThumbnailUrl(article.images[0]) : null
      },
      logic_check: {
        has_images_array: !!(article.images && Array.isArray(article.images) && article.images.length > 0),
        has_image_url: !!(article.image_url && typeof article.image_url === 'string' && article.image_url.trim()),
        would_use_images_array: !!(article.images && Array.isArray(article.images) && article.images.length > 0),
        would_use_image_url: !(article.images && Array.isArray(article.images) && article.images.length > 0) && !!(article.image_url && typeof article.image_url === 'string' && article.image_url.trim())
      }
    };
    
    return NextResponse.json(debugInfo, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Debug images error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Debug failed', details: errorMessage }, { status: 500 });
  }
}