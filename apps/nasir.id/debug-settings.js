// Debug script to check settings API response
// Run this in browser console or as a Node.js script

async function debugSettings() {
    try {
        console.log('🔍 Fetching settings from API...');
        
        const response = await fetch('/api/settings', {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache',
            },
        });
        
        if (!response.ok) {
            console.error('❌ API request failed:', response.status, response.statusText);
            return;
        }
        
        const settings = await response.json();
        
        console.log('📋 Raw API Response:');
        console.log(JSON.stringify(settings, null, 2));
        
        console.log('\n🖼️ Image URLs Analysis:');
        
        if (settings.about_image) {
            console.log('about_image (raw):', settings.about_image);
            console.log('Is S3 URL?:', settings.about_image.includes('amazonaws.com'));
            console.log('Is assets URL?:', settings.about_image.includes('assets.nasir.id'));
        }
        
        if (settings.hero_image) {
            console.log('hero_image (raw):', settings.hero_image);
            console.log('Is S3 URL?:', settings.hero_image.includes('amazonaws.com'));
            console.log('Is assets URL?:', settings.hero_image.includes('assets.nasir.id'));
        }
        
        // Test URL conversion
        function convertToAssetsUrl(url) {
            if (!url) return url;
            
            if (url.startsWith('https://assets.nasir.id/')) {
                return url;
            }
            
            const s3Patterns = [
                /^https:\/\/s3\.([^.]+)\.amazonaws\.com\/([^/]+)\/(.+)$/,
                /^https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/,
                /^https:\/\/([^.]+)\.s3\.amazonaws\.com\/(.+)$/
            ];
            
            for (const pattern of s3Patterns) {
                const match = url.match(pattern);
                if (match) {
                    const key = match[3] || match[2];
                    return `https://assets.nasir.id/${key}`;
                }
            }
            
            return url;
        }
        
        console.log('\n🔄 URL Conversion Test:');
        if (settings.about_image) {
            const converted = convertToAssetsUrl(settings.about_image);
            console.log('Original:', settings.about_image);
            console.log('Converted:', converted);
            console.log('Changed?:', settings.about_image !== converted);
        }
        
    } catch (error) {
        console.error('💥 Error:', error);
    }
}

// Run the debug
debugSettings();