import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { uploadImageWithSizes } from '@/lib/s3';

// Configure maximum file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

// Configure route segment for large uploads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: Request) {
  console.log('🔄 [UPLOAD] Starting upload request...');
  
  try {
    // Check content length first
    const contentLength = request.headers.get('content-length');
    console.log(`📏 [UPLOAD] Content-Length header: ${contentLength} bytes`);
    
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      console.log(`❌ [UPLOAD] Request too large: ${contentLength} bytes (max: ${MAX_FILE_SIZE})`);
      return NextResponse.json({ 
        error: `Request too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` 
      }, { status: 413 });
    }
    
    const authed = await isAuthenticated();
    if (!authed) {
      console.log('❌ [UPLOAD] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ [UPLOAD] Authentication successful');

    console.log('📝 [UPLOAD] Parsing form data...');
    
    // Add timeout for form data parsing
    const parseTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Form data parsing timeout')), 30000); // 30 second timeout
    });
    
    const formDataPromise = request.formData();
    const formData = await Promise.race([formDataPromise, parseTimeout]) as FormData;
    
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
    
    // Add timeout for buffer conversion
    const bufferTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Buffer conversion timeout')), 30000); // 30 second timeout
    });
    
    const arrayBufferPromise = file.arrayBuffer();
    const bytes = await Promise.race([arrayBufferPromise, bufferTimeout]) as ArrayBuffer;
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
      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        return NextResponse.json({ error: 'Upload timeout. Please try with a smaller file or check your connection.' }, { status: 408 });
      }
      if (error.message.includes('size') || error.message.includes('limit') || error.message.includes('large')) {
        return NextResponse.json({ error: 'File too large. Please compress your image and try again.' }, { status: 413 });
      }
      if (error.message.includes('network') || error.message.includes('connection')) {
        return NextResponse.json({ error: 'Network error. Please check your connection and try again.' }, { status: 503 });
      }
      if (error.message.includes('parsing') || error.message.includes('FormData')) {
        return NextResponse.json({ error: 'Failed to process file. Please try again.' }, { status: 400 });
      }
    }
    
    return NextResponse.json({ error: 'Failed to upload file. Please try again.' }, { status: 500 });
  }
}
