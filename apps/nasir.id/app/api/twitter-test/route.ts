import { NextResponse } from 'next/server';

export async function GET() {
  const testImageUrl = 'https://assets.nasir.id/uploads/2026/03/07/1772859194033-pixar-2-thumb.jpg';
  
  // Test if the image is accessible
  try {
    const imageResponse = await fetch(testImageUrl, { method: 'HEAD' });
    const imageAccessible = imageResponse.ok;
    const contentType = imageResponse.headers.get('content-type');
    const contentLength = imageResponse.headers.get('content-length');
    
    return NextResponse.json({
      imageUrl: testImageUrl,
      accessible: imageAccessible,
      status: imageResponse.status,
      contentType,
      contentLength,
      headers: Object.fromEntries(imageResponse.headers.entries()),
    });
  } catch (error) {
    return NextResponse.json({
      imageUrl: testImageUrl,
      accessible: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}