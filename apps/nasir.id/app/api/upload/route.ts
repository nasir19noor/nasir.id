import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { uploadImageWithSizes } from '@/lib/s3';

// Configure maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export async function POST(request: Request) {
  console.log('🔄 [UPLOAD] Starting upload request...');
  
  const authed = await isAuthenticated();
  if (!authed) {
    console.log('❌ [UPLOAD] Authentication failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.log('✅ [UPLOAD] Authentication successful');

  try {
    console.log('📝 [UPLOAD] Parsing form data...');
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('❌ [UPLOAD] No file provided in form data');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.log(`❌ [UPLOAD] File too large: ${file.size} bytes (max: ${MAX_FILE_SIZE})`);
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` 
      }, { status: 413 });
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      console.log(`❌ [UPLOAD] Invalid file type: ${file.type}`);
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    console.log(`📁 [UPLOAD] File received: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${file.type}`);

    console.log('🔄 [UPLOAD] Converting file to buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log(`✅ [UPLOAD] Buffer created, size: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);

    console.log('☁️ [UPLOAD] Starting S3 upload...');
    const result = await uploadImageWithSizes(buffer, file.name, file.type);
    console.log('✅ [UPLOAD] S3 upload completed:', result);

    // Return the medium size as the primary URL (or original if no medium exists)
    const url = result.medium || result.original;
    console.log(`🎯 [UPLOAD] Primary URL selected: ${url}`);

    return NextResponse.json({ 
      url,
      sizes: result 
    });
  } catch (error) {
    console.error('💥 [UPLOAD] Error uploading file:', error);
    console.error('💥 [UPLOAD] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json({ error: 'Upload timeout. Please try with a smaller file.' }, { status: 408 });
      }
      if (error.message.includes('size') || error.message.includes('limit')) {
        return NextResponse.json({ error: 'File too large. Please compress your image and try again.' }, { status: 413 });
      }
      if (error.message.includes('network') || error.message.includes('connection')) {
        return NextResponse.json({ error: 'Network error. Please check your connection and try again.' }, { status: 503 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to upload file. Please try again.' }, { status: 500 });
  }
}
