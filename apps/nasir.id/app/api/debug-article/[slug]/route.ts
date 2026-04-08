import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { convertToAssetsUrl } from '@/lib/image-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const results = await sql`
      SELECT id, title, summary, content, image_url, images, published_at, is_portfolio
      FROM articles 
      WHERE slug = ${slug}
      LIMIT 1
    `;

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const item = results[0];
    
    // Debug image processing
    const debugInfo = {
      article: {
        id: item.id,
        title: item.title,
        slug: slug,
        is_portfolio: item.is_portfolio
      },
      images: {
        raw_image_url: item.image_url,
        raw_images_array: item.images,
        converted_image_url: item.image_url ? convertToAssetsUrl(item.image_url) : null,
        converted_images_array: item.images ? item.images.map(convertToAssetsUrl) : null,
        images_array_length: item.images ? item.images.length : 0,
        has_images_array: !!(item.images && item.images.length > 0),
        has_image_url: !!item.image_url
      },
      processing: {
        would_use_images_array: !!(item.images && item.images.length > 0),
        would_use_image_url: !item.images?.length && !!item.image_url,
        would_use_default: !item.images?.length && !item.image_url,
        final_image: '' // Add this property to the type
      }
    };
    
    // Determine final image
    let finalImage = 'DEFAULT_PROFILE_IMAGE';
    if (item.images && item.images.length > 0) {
      finalImage = convertToAssetsUrl(item.images[0]);
    } else if (item.image_url) {
      finalImage = convertToAssetsUrl(item.image_url);
    }
    
    debugInfo.processing.final_image = finalImage;
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug article error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
}