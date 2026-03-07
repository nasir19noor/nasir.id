import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Export s3Client for use in other modules
export { s3Client };

// Debug AWS configuration
console.log('🔧 [S3] AWS Configuration:');
console.log(`   Region: ${process.env.AWS_REGION || 'us-east-1'}`);
console.log(`   Bucket: ${process.env.AWS_S3_BUCKET || 'NOT SET'}`);
console.log(`   Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? '***' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'NOT SET'}`);
console.log(`   Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? 'SET (***' + process.env.AWS_SECRET_ACCESS_KEY.slice(-4) + ')' : 'NOT SET'}`);

interface UploadResult {
  original: string;
  large?: string;
  medium?: string;
  thumbnail?: string;
}

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  console.log(`🔄 [S3] Starting single file upload: ${fileName}`);
  
  const bucket = process.env.AWS_S3_BUCKET || '';
  
  if (!bucket) {
    console.error('❌ [S3] AWS_S3_BUCKET environment variable not set');
    throw new Error('S3 bucket not configured');
  }
  
  // Create date-based directory structure: uploads/YYYY/MM/DD/
  // Use Asia/Jakarta timezone (UTC+7) for consistent date folders
  const now = new Date();
  
  // More reliable timezone handling using Intl.DateTimeFormat
  const jakartaFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const jakartaDateParts = jakartaFormatter.formatToParts(now);
  const year = jakartaDateParts.find(part => part.type === 'year')?.value || '';
  const month = jakartaDateParts.find(part => part.type === 'month')?.value || '';
  const day = jakartaDateParts.find(part => part.type === 'day')?.value || '';
  const datePrefix = `${year}/${month}/${day}`;
  
  console.log(`📅 [S3] Using Jakarta time for date folder: ${datePrefix} (UTC: ${now.toISOString()})`);
  
  const key = `uploads/${datePrefix}/${Date.now()}-${fileName}`;
  console.log(`📁 [S3] Upload key: ${key}`);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  try {
    console.log(`☁️ [S3] Sending upload command to S3...`);
    await s3Client.send(command);
    // Return assets domain URL instead of S3 URL
    const url = `${process.env.ASSETS_DOMAIN || 'https://assets.nasir.id'}/${key}`;
    console.log(`✅ [S3] Upload successful, returning assets URL: ${url}`);
    return url;
  } catch (error) {
    console.error('💥 [S3] Upload failed:', error);
    throw error;
  }
}

export async function uploadImageWithSizes(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  console.log(`🖼️ [S3] Starting multi-size image upload: ${fileName} (${contentType})`);
  
  const bucket = process.env.AWS_S3_BUCKET || '';
  
  if (!bucket) {
    console.error('❌ [S3] AWS_S3_BUCKET environment variable not set');
    throw new Error('S3 bucket not configured');
  }
  
  // Create date-based directory structure
  // Use Asia/Jakarta timezone (UTC+7) for consistent date folders
  const now = new Date();
  
  // More reliable timezone handling using Intl.DateTimeFormat
  const jakartaFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const jakartaDateParts = jakartaFormatter.formatToParts(now);
  const year = jakartaDateParts.find(part => part.type === 'year')?.value || '';
  const month = jakartaDateParts.find(part => part.type === 'month')?.value || '';
  const day = jakartaDateParts.find(part => part.type === 'day')?.value || '';
  const datePrefix = `${year}/${month}/${day}`;
  const timestamp = Date.now();
  
  console.log(`📅 [S3] Using Jakarta time for date folder: uploads/${datePrefix}/ (UTC: ${now.toISOString()})`);
  
  // Remove extension from filename
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  const ext = fileName.split('.').pop() || 'jpg';
  console.log(`📝 [S3] Filename parts: ${nameWithoutExt}.${ext}`);

  const result: UploadResult = {
    original: '',
  };

  // Check if it's an image
  if (!contentType.startsWith('image/')) {
    console.log(`📄 [S3] Non-image file detected, uploading original only`);
    // Not an image, just upload original
    const key = `uploads/${datePrefix}/${timestamp}-${fileName}`;
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
      }));
      result.original = `${process.env.ASSETS_DOMAIN || 'https://assets.nasir.id'}/${key}`;
      console.log(`✅ [S3] Non-image upload successful: ${result.original}`);
      return result;
    } catch (error) {
      console.error('💥 [S3] Non-image upload failed:', error);
      throw error;
    }
  }

  try {
    console.log(`🔍 [S3] Analyzing image metadata...`);
    // Get image metadata
    const image = sharp(file);
    const metadata = await image.metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;
    console.log(`📐 [S3] Image dimensions: ${originalWidth}x${originalHeight}`);

    // Upload original
    console.log(`📤 [S3] Uploading original image...`);
    const originalKey = `uploads/${datePrefix}/${timestamp}-${nameWithoutExt}.${ext}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: originalKey,
      Body: file,
      ContentType: contentType,
    }));
    result.original = `${process.env.ASSETS_DOMAIN || 'https://assets.nasir.id'}/${originalKey}`;
    console.log(`✅ [S3] Original uploaded: ${result.original}`);

    // Generate and upload resized versions only if original is large enough
    if (originalWidth > 1920) {
      console.log(`🔄 [S3] Generating large version (1920px)...`);
      // Large version (1920px width)
      const largeBuffer = await sharp(file)
        .resize(1920, null, { withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      const largeKey = `uploads/${datePrefix}/${timestamp}-${nameWithoutExt}-large.jpg`;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: largeKey,
        Body: largeBuffer,
        ContentType: 'image/jpeg',
      }));
      result.large = `${process.env.ASSETS_DOMAIN || 'https://assets.nasir.id'}/${largeKey}`;
      console.log(`✅ [S3] Large version uploaded: ${result.large}`);
    } else {
      console.log(`⏭️ [S3] Skipping large version (original width ${originalWidth} <= 1920)`);
    }

    if (originalWidth > 1024) {
      console.log(`🔄 [S3] Generating medium version (1024px)...`);
      // Medium version (1024px width)
      const mediumBuffer = await sharp(file)
        .resize(1024, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      
      const mediumKey = `uploads/${datePrefix}/${timestamp}-${nameWithoutExt}-medium.jpg`;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: mediumKey,
        Body: mediumBuffer,
        ContentType: 'image/jpeg',
      }));
      result.medium = `${process.env.ASSETS_DOMAIN || 'https://assets.nasir.id'}/${mediumKey}`;
      console.log(`✅ [S3] Medium version uploaded: ${result.medium}`);
    } else {
      console.log(`⏭️ [S3] Skipping medium version (original width ${originalWidth} <= 1024)`);
    }

    if (originalWidth > 400) {
      console.log(`🔄 [S3] Generating thumbnail version (400px)...`);
      // Thumbnail version (400px width)
      const thumbnailBuffer = await sharp(file)
        .resize(400, null, { withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();
      
      const thumbnailKey = `uploads/${datePrefix}/${timestamp}-${nameWithoutExt}-thumb.jpg`;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: 'image/jpeg',
      }));
      result.thumbnail = `${process.env.ASSETS_DOMAIN || 'https://assets.nasir.id'}/${thumbnailKey}`;
      console.log(`✅ [S3] Thumbnail uploaded: ${result.thumbnail}`);
    } else {
      console.log(`⏭️ [S3] Skipping thumbnail (original width ${originalWidth} <= 400)`);
    }

    console.log(`🎉 [S3] Multi-size upload completed successfully:`, result);
    return result;
    
  } catch (error) {
    console.error('💥 [S3] Image processing/upload failed:', error);
    console.error('💥 [S3] Error details:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}
