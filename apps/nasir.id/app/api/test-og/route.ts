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
    const testImageUrl = 'https://images.unsplash.com/photo-1752859951149-7d3fc700a7ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxOYXNpcnwxNzcyNjAxMzE2fDA&ixlib=rb-4.1.0&q=80&w=1200&h=630';
    
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