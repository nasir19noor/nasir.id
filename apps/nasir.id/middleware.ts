import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle upload routes with larger body size limits
  if (request.nextUrl.pathname.startsWith('/api/upload')) {
    // Add headers to handle large uploads
    const response = NextResponse.next();
    
    // Set longer timeout for upload routes
    response.headers.set('x-middleware-cache', 'no-cache');
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/upload/:path*',
    '/api/gallery/:path*'
  ]
};