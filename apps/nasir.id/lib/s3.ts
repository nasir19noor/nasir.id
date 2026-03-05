import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

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
  const bucket = process.env.AWS_S3_BUCKET || '';
  const region = process.env.AWS_REGION || 'us-east-1';
  
  // Create date-based directory structure: uploads/YYYY/MM/DD/
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}/${month}/${day}`;
  
  const key = `uploads/${datePrefix}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
}

export async function uploadImageWithSizes(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  const bucket = process.env.AWS_S3_BUCKET || '';
  const region = process.env.AWS_REGION || 'us-east-1';
  
  // Create date-based directory structure
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}/${month}/${day}`;
  const timestamp = Date.now();
  
  // Remove extension from filename
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  const ext = fileName.split('.').pop() || 'jpg';

  const result: UploadResult = {
    original: '',
  };

  // Check if it's an image
  if (!contentType.startsWith('image/')) {
    // Not an image, just upload original
    const key = `uploads/${datePrefix}/${timestamp}-${fileName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
    }));
    result.original = `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
    return result;
  }

  // Get image metadata
  const image = sharp(file);
  const metadata = await image.metadata();
  const originalWidth = metadata.width || 0;

  // Upload original
  const originalKey = `uploads/${datePrefix}/${timestamp}-${nameWithoutExt}.${ext}`;
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: originalKey,
    Body: file,
    ContentType: contentType,
  }));
  result.original = `https://s3.${region}.amazonaws.com/${bucket}/${originalKey}`;

  // Generate and upload resized versions only if original is large enough
  if (originalWidth > 1920) {
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
    result.large = `https://s3.${region}.amazonaws.com/${bucket}/${largeKey}`;
  }

  if (originalWidth > 1024) {
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
    result.medium = `https://s3.${region}.amazonaws.com/${bucket}/${mediumKey}`;
  }

  if (originalWidth > 400) {
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
    result.thumbnail = `https://s3.${region}.amazonaws.com/${bucket}/${thumbnailKey}`;
  }

  return result;
}
