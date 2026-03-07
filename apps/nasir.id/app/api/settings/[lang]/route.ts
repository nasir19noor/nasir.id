import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';
import { convertToAssetsUrl } from '@/lib/image-utils';

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

        // Get translated settings
        const translatedSettings = await sql`
            SELECT setting_key, value 
            FROM setting_translations
            WHERE language = ${lang}
        `;
        
        // Get shared settings (like images) from main settings table
        const sharedSettings = await sql`
            SELECT key, value 
            FROM settings
            WHERE key IN ('about_image', 'hero_image', 'profile_image')
        `;
        
        const settingsObj: Record<string, string> = {};
        
        // Add translated settings
        translatedSettings.forEach((setting) => {
            settingsObj[setting.setting_key as string] = setting.value as string;
        });
        
        // Add shared settings with image URL conversion
        sharedSettings.forEach((setting) => {
            let value = setting.value as string;
            
            // Convert image URLs to assets domain
            if (setting.key === 'about_image' || setting.key === 'hero_image' || setting.key === 'profile_image') {
                value = convertToAssetsUrl(value);
            }
            
            settingsObj[setting.key as string] = value;
        });
        
        return NextResponse.json(settingsObj, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}