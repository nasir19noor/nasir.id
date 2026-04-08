import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { convertToAssetsUrl } from '@/lib/image-utils';

export async function POST() {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('🔧 [FIX-URLS] Starting image URL conversion...');
        
        // Get all settings with image URLs
        const settings = await sql`
            SELECT key, value 
            FROM settings 
            WHERE key IN ('about_image', 'hero_image', 'profile_image')
            AND value IS NOT NULL
        `;
        
        const results = [];
        
        for (const setting of settings) {
            const originalUrl = setting.value as string;
            const convertedUrl = convertToAssetsUrl(originalUrl);
            
            if (originalUrl !== convertedUrl) {
                console.log(`🔄 [FIX-URLS] Converting ${setting.key}:`);
                console.log(`   From: ${originalUrl}`);
                console.log(`   To:   ${convertedUrl}`);
                
                // Update the database
                await sql`
                    UPDATE settings 
                    SET value = ${convertedUrl}, updated_at = NOW()
                    WHERE key = ${setting.key}
                `;
                
                results.push({
                    key: setting.key,
                    original: originalUrl,
                    converted: convertedUrl,
                    status: 'updated'
                });
            } else {
                console.log(`✅ [FIX-URLS] ${setting.key} already uses assets domain`);
                results.push({
                    key: setting.key,
                    url: originalUrl,
                    status: 'already_correct'
                });
            }
        }
        
        // Also fix articles table
        const articles = await sql`
            SELECT id, image_url, images 
            FROM articles 
            WHERE (image_url LIKE '%amazonaws.com%' OR images::text LIKE '%amazonaws.com%')
        `;
        
        for (const article of articles) {
            let updated = false;
            
            // Fix image_url
            if (article.image_url && article.image_url.includes('amazonaws.com')) {
                const convertedUrl = convertToAssetsUrl(article.image_url);
                await sql`
                    UPDATE articles 
                    SET image_url = ${convertedUrl}
                    WHERE id = ${article.id}
                `;
                console.log(`🔄 [FIX-URLS] Updated article ${article.id} image_url`);
                updated = true;
            }
            
            // Fix images array
            if (article.images && Array.isArray(article.images)) {
                const convertedImages = article.images.map((url: string) => convertToAssetsUrl(url));
                const hasChanges = article.images.some((url: string, index: number) => 
                    url !== convertedImages[index]
                );
                
                if (hasChanges) {
                    await sql`
                        UPDATE articles 
                        SET images = ${convertedImages}
                        WHERE id = ${article.id}
                    `;
                    console.log(`🔄 [FIX-URLS] Updated article ${article.id} images array`);
                    updated = true;
                }
            }
            
            if (updated) {
                results.push({
                    type: 'article',
                    id: article.id,
                    status: 'updated'
                });
            }
        }
        
        console.log('✅ [FIX-URLS] Image URL conversion completed');
        
        return NextResponse.json({
            success: true,
            message: 'Image URLs converted successfully',
            results
        });
        
    } catch (error) {
        console.error('💥 [FIX-URLS] Error:', error);
        return NextResponse.json({ 
            error: 'Failed to convert image URLs',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}