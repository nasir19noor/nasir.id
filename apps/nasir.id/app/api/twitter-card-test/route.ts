import { NextResponse } from 'next/server';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Twitter Card API Test - Nasir.id</title>
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@nasir19noor">
    <meta name="twitter:creator" content="@nasir19noor">
    <meta name="twitter:title" content="API Twitter Card Test - Nasir Noor">
    <meta name="twitter:description" content="Testing Twitter Card image display via API endpoint">
    <meta name="twitter:image" content="https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1200&h=630&fit=crop">
    <meta name="twitter:image:alt" content="Test Image for Twitter Card">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:type" content="article">
    <meta property="og:title" content="API Twitter Card Test - Nasir Noor">
    <meta property="og:description" content="Testing Twitter Card image display via API endpoint">
    <meta property="og:image" content="https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1200&h=630&fit=crop">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:url" content="https://nasir.id/api/twitter-card-test">
    <meta property="og:site_name" content="Nasir.id">
</head>
<body>
    <h1>API Twitter Card Test Page</h1>
    <p>This is a test page generated via API to verify Twitter Card functionality.</p>
    <p>Test this URL in Twitter Card Validator: <a href="https://cards-dev.twitter.com/validator?url=https://nasir.id/api/twitter-card-test" target="_blank">https://cards-dev.twitter.com/validator</a></p>
    <p>Share test: <a href="https://twitter.com/intent/tweet?text=API Test&url=https://nasir.id/api/twitter-card-test&via=nasir19noor" target="_blank">Share on Twitter</a></p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}