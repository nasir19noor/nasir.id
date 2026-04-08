import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { convertToAssetsUrl } from '@/lib/image-utils';

export async function GET() {
    try {
        const settings = await sql`
            SELECT key, value 
            FROM settings
        `;
        
        const settingsObj: Record<string, string> = {};
        settings.forEach((setting) => {
            let value = setting.value as string;
            
            // Convert image URLs to assets domain
            if (setting.key === 'about_image' || setting.key === 'hero_image' || setting.key === 'profile_image') {
                const originalValue = value;
                value = convertToAssetsUrl(value);
                
                // Debug logging
                if (originalValue !== value) {
                    console.log(`🔄 [SETTINGS API] Converted ${setting.key}:`);
                    console.log(`   From: ${originalValue}`);
                    console.log(`   To:   ${value}`);
                }
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

export async function PUT(request: Request) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        
        for (const [key, value] of Object.entries(body)) {
            await sql`
                INSERT INTO settings (key, value, updated_at)
                VALUES (${key}, ${value as string}, NOW())
                ON CONFLICT (key) 
                DO UPDATE SET value = ${value as string}, updated_at = NOW()
            `;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
