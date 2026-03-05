// Utility functions for handling image URLs and sizes

export function getThumbnailUrl(imageUrl: string): string {
    if (!imageUrl) return imageUrl;
    
    // If it's an external URL (not from our S3), return as-is
    if (!imageUrl.includes('s3.') && !imageUrl.includes('amazonaws.com')) {
        return imageUrl;
    }
    
    // Check if URL already has a size suffix
    if (imageUrl.includes('-thumb.jpg') || imageUrl.includes('-thumbnail.jpg')) {
        return imageUrl;
    }
    
    // Replace the filename with thumbnail version
    // Example: /uploads/2026/03/05/123456-image.jpg -> /uploads/2026/03/05/123456-image-thumb.jpg
    // Example: /uploads/2026/03/05/123456-image-medium.jpg -> /uploads/2026/03/05/123456-image-thumb.jpg
    
    // Remove existing size suffixes first
    let url = imageUrl.replace(/-large\.jpg$/, '.jpg')
                      .replace(/-medium\.jpg$/, '.jpg');
    
    // Add thumbnail suffix
    url = url.replace(/\.jpg$/, '-thumb.jpg')
             .replace(/\.jpeg$/, '-thumb.jpg')
             .replace(/\.png$/, '-thumb.jpg');
    
    return url;
}

export function getMediumUrl(imageUrl: string): string {
    if (!imageUrl) return imageUrl;
    
    // If it's an external URL (not from our S3), return as-is
    if (!imageUrl.includes('s3.') && !imageUrl.includes('amazonaws.com')) {
        return imageUrl;
    }
    
    // Check if URL already has medium suffix
    if (imageUrl.includes('-medium.jpg')) {
        return imageUrl;
    }
    
    // Remove existing size suffixes first
    let url = imageUrl.replace(/-large\.jpg$/, '.jpg')
                      .replace(/-thumb\.jpg$/, '.jpg');
    
    // Add medium suffix
    url = url.replace(/\.jpg$/, '-medium.jpg')
             .replace(/\.jpeg$/, '-medium.jpg')
             .replace(/\.png$/, '-medium.jpg');
    
    return url;
}

export function getOriginalUrl(imageUrl: string): string {
    if (!imageUrl) return imageUrl;
    
    // Remove all size suffixes to get original
    return imageUrl.replace(/-large\.jpg$/, '.jpg')
                   .replace(/-medium\.jpg$/, '.jpg')
                   .replace(/-thumb\.jpg$/, '.jpg');
}
