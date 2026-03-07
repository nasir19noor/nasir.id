/**
 * Utility functions for handling image URLs and migrations
 */

/**
 * Convert S3 bucket URL to assets domain URL
 * @param url - The original S3 URL or assets URL
 * @returns The assets domain URL
 */
export function convertToAssetsUrl(url: string): string {
  if (!url) return url;
  
  const assetsDomain = process.env.ASSETS_DOMAIN || 'https://assets.nasir.id';
  
  // If already an assets URL, return as is
  if (url.startsWith(assetsDomain)) {
    return url;
  }
  
  // Convert S3 URLs to assets URLs using environment variables
  const s3Patterns = [
    process.env.S3_BUCKET_URL_1 || 'https://s3.ap-southeast-1.amazonaws.com/www.nasir.id',
    process.env.S3_BUCKET_URL_2 || 'https://www.nasir.id.s3.ap-southeast-1.amazonaws.com',
    process.env.S3_BUCKET_URL_3 || 'https://www.nasir.id.s3.amazonaws.com'
  ];
  
  for (const s3Url of s3Patterns) {
    if (url.startsWith(s3Url + '/')) {
      const key = url.replace(s3Url + '/', '');
      return `${assetsDomain}/${key}`;
    }
  }
  
  // If no pattern matches, return original URL
  return url;
}

/**
 * Get the appropriate image URL based on size preference
 * @param imageUrls - Object containing different image sizes
 * @param preferredSize - The preferred size ('thumbnail', 'medium', 'large', 'original')
 * @returns The best available image URL
 */
export function getImageUrl(
  imageUrls: {
    original?: string;
    large?: string;
    medium?: string;
    thumbnail?: string;
  },
  preferredSize: 'thumbnail' | 'medium' | 'large' | 'original' = 'medium'
): string {
  // Convert all URLs to assets domain
  const convertedUrls = {
    original: imageUrls.original ? convertToAssetsUrl(imageUrls.original) : '',
    large: imageUrls.large ? convertToAssetsUrl(imageUrls.large) : '',
    medium: imageUrls.medium ? convertToAssetsUrl(imageUrls.medium) : '',
    thumbnail: imageUrls.thumbnail ? convertToAssetsUrl(imageUrls.thumbnail) : '',
  };
  
  // Return preferred size if available, otherwise fallback
  switch (preferredSize) {
    case 'thumbnail':
      return convertedUrls.thumbnail || convertedUrls.medium || convertedUrls.original || '';
    case 'medium':
      return convertedUrls.medium || convertedUrls.large || convertedUrls.original || '';
    case 'large':
      return convertedUrls.large || convertedUrls.original || convertedUrls.medium || '';
    case 'original':
      return convertedUrls.original || convertedUrls.large || convertedUrls.medium || '';
    default:
      return convertedUrls.medium || convertedUrls.original || '';
  }
}

/**
 * Process image URLs from database records
 * @param record - Database record with image_url and/or images fields
 * @returns Processed record with converted URLs
 */
export function processImageUrls<T extends { image_url?: string; images?: string[] }>(record: T): T {
  const processed = { ...record };
  
  // Convert main image URL
  if (processed.image_url) {
    processed.image_url = convertToAssetsUrl(processed.image_url);
  }
  
  // Convert images array URLs
  if (processed.images && Array.isArray(processed.images)) {
    processed.images = processed.images.map(convertToAssetsUrl);
  }
  
  return processed;
}

/**
 * Add cache busting parameter to image URL
 * @param url - The image URL
 * @returns URL with cache busting parameter
 */
export function addCacheBuster(url: string): string {
  if (!url) return url;
  
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
}
/**
 * Get thumbnail URL from an image URL
 * @param imageUrl - The original image URL
 * @returns The thumbnail URL
 */
export function getThumbnailUrl(imageUrl: string): string {
  if (!imageUrl) return '';
  
  // Convert to assets domain first
  const assetsUrl = convertToAssetsUrl(imageUrl);
  
  // If it's already a thumbnail, return as is
  if (assetsUrl.includes('-thumb.')) {
    return assetsUrl;
  }
  
  // Try to generate thumbnail URL by replacing the filename
  const lastSlashIndex = assetsUrl.lastIndexOf('/');
  const lastDotIndex = assetsUrl.lastIndexOf('.');
  
  if (lastSlashIndex !== -1 && lastDotIndex !== -1 && lastDotIndex > lastSlashIndex) {
    const path = assetsUrl.substring(0, lastDotIndex);
    const extension = assetsUrl.substring(lastDotIndex);
    return `${path}-thumb.jpg`; // Thumbnails are always JPG
  }
  
  // Fallback to original URL
  return assetsUrl;
}