import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test the settings API
    const settingsResponse = await fetch('https://nasir.id/api/settings', {
      cache: 'no-store',
    });
    
    let settings = {};
    if (settingsResponse.ok) {
      settings = await settingsResponse.json();
    }
    
    // Test image URL
    const testImageUrl = 'https://assets.nasir.id/uploads/2026/03/07/1772859194033-pixar-2-thumb.jpg';
    
    return NextResponse.json({
      success: true,
      settings,
      testImageUrl,
      message: 'OG metadata test endpoint'
    });
  } catch (error) {
    console.error('Test OG error:', error);
    return NextResponse.json({ error: 'Test failed' }, { status: 500 });
  }
}