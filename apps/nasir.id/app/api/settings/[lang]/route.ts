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

        // Get settings for the specified language
        const settings = await sql`
            SELECT key, value 
            FROM settings
            WHERE language = ${lang}
        `;
        
        const settingsObj: Record<string, string> = {};
        
        // Process settings with image URL conversion
        settings.forEach((setting) => {
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ lang: string }> }
) {
    try {
        const { lang } = await params;
        
        // Validate language parameter
        if (!['en', 'id'].includes(lang)) {
            return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
        }

        const body = await request.json();
        
        // Update each setting for the specified language
        for (const [key, value] of Object.entries(body)) {
            if (key === 'language') continue; // Skip the language field itself
            
            await sql`
                INSERT INTO settings (key, value, language, updated_at)
                VALUES (${key}, ${value as string}, ${lang}, NOW())
                ON CONFLICT (key, language)
                DO UPDATE SET 
                    value = EXCLUDED.value,
                    updated_at = EXCLUDED.updated_at
            `;
        }
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}