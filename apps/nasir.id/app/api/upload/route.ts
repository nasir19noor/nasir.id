import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { uploadImageWithSizes } from '@/lib/s3';

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

    console.log(`📁 [UPLOAD] File received: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    console.log('🔄 [UPLOAD] Converting file to buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log(`✅ [UPLOAD] Buffer created, size: ${buffer.length} bytes`);

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
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
