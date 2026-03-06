import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { uploadImageWithSizes } from '@/lib/s3';

// Configure route for chunked uploads
export const runtime = 'nodejs';
export const maxDuration = 60;

// Chunk size: 1MB per chunk
const CHUNK_SIZE = 1024 * 1024; // 1MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB total

interface ChunkData {
  chunk: string; // base64 encoded chunk
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadId: string;
}

// Store chunks in memory (in production, use Redis or database)
const uploadSessions = new Map<string, {
  chunks: Buffer[];
  fileName: string;
  fileType: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: number;
}>();

export async function POST(request: Request) {
  console.log('🔄 [CHUNKED-UPLOAD] Starting chunked upload request...');
  
  try {
    const authed = await isAuthenticated();
    if (!authed) {
      console.log('❌ [CHUNKED-UPLOAD] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: ChunkData = await request.json();
    const { chunk, chunkIndex, totalChunks, fileName, fileType, fileSize, uploadId } = data;

    console.log(`📦 [CHUNKED-UPLOAD] Received chunk ${chunkIndex + 1}/${totalChunks} for ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` 
      }, { status: 413 });
    }

    // Validate file type
    if (!fileType.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Initialize upload session if first chunk
    if (chunkIndex === 0) {
      uploadSessions.set(uploadId, {
        chunks: new Array(totalChunks),
        fileName,
        fileType,
        fileSize,
        totalChunks,
        receivedChunks: 0
      });
      console.log(`🆕 [CHUNKED-UPLOAD] Initialized upload session: ${uploadId}`);
    }

    const session = uploadSessions.get(uploadId);
    if (!session) {
      return NextResponse.json({ error: 'Upload session not found' }, { status: 400 });
    }

    // Store chunk
    const chunkBuffer = Buffer.from(chunk, 'base64');
    session.chunks[chunkIndex] = chunkBuffer;
    session.receivedChunks++;

    console.log(`📥 [CHUNKED-UPLOAD] Stored chunk ${chunkIndex + 1}/${totalChunks} (${session.receivedChunks}/${totalChunks} received)`);

    // Check if all chunks received
    if (session.receivedChunks === totalChunks) {
      console.log(`🔗 [CHUNKED-UPLOAD] All chunks received, assembling file...`);
      
      // Combine all chunks
      const completeBuffer = Buffer.concat(session.chunks);
      console.log(`✅ [CHUNKED-UPLOAD] File assembled: ${(completeBuffer.length / 1024 / 1024).toFixed(2)}MB`);

      // Clean up session
      uploadSessions.delete(uploadId);

      // Upload to S3
      console.log('☁️ [CHUNKED-UPLOAD] Starting S3 upload...');
      const result = await uploadImageWithSizes(completeBuffer, fileName, fileType);
      console.log('✅ [CHUNKED-UPLOAD] S3 upload completed:', result);

      // Return the medium size as the primary URL (or original if no medium exists)
      const url = result.medium || result.original;

      return NextResponse.json({ 
        url,
        sizes: result,
        complete: true
      });
    } else {
      // Return progress
      return NextResponse.json({ 
        complete: false,
        progress: (session.receivedChunks / totalChunks) * 100,
        receivedChunks: session.receivedChunks,
        totalChunks: totalChunks
      });
    }

  } catch (error) {
    console.error('💥 [CHUNKED-UPLOAD] Error:', error);
    return NextResponse.json({ error: 'Failed to process chunk' }, { status: 500 });
  }
}