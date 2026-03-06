// Simple test to verify URL conversion is working
// Run with: node test-url-conversion.js

function convertToAssetsUrl(url) {
  if (!url) return url;
  
  // If already an assets URL, return as is
  if (url.startsWith('https://assets.nasir.id/')) {
    return url;
  }
  
  // Convert S3 URLs to assets URLs
  const s3Patterns = [
    /^https:\/\/s3\.([^.]+)\.amazonaws\.com\/([^/]+)\/(.+)$/,
    /^https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)$/,
    /^https:\/\/([^.]+)\.s3\.amazonaws\.com\/(.+)$/
  ];
  
  for (const pattern of s3Patterns) {
    const match = url.match(pattern);
    if (match) {
      // Extract the key (path after bucket name)
      const key = match[3] || match[2];
      return `https://assets.nasir.id/${key}`;
    }
  }
  
  // If no pattern matches, return original URL
  return url;
}

// Test cases
const testUrls = [
  'https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/uploads/2024/03/06/profile.jpg',
  'https://www.nasir.id.s3.ap-southeast-1.amazonaws.com/uploads/2024/03/06/profile.jpg',
  'https://www.nasir.id.s3.amazonaws.com/uploads/2024/03/06/profile.jpg',
  'https://assets.nasir.id/uploads/2024/03/06/profile.jpg', // Should remain unchanged
  'https://example.com/image.jpg', // Should remain unchanged
];

console.log('🧪 Testing URL Conversion:');
console.log('========================');

testUrls.forEach((url, index) => {
  const converted = convertToAssetsUrl(url);
  console.log(`${index + 1}. Input:  ${url}`);
  console.log(`   Output: ${converted}`);
  console.log(`   ✅ ${converted.startsWith('https://assets.nasir.id/') || !url.includes('amazonaws.com') ? 'PASS' : 'FAIL'}`);
  console.log('');
});