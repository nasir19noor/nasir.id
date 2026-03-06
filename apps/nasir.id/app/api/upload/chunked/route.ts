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
    console.log('🔐 [CHUNKED-UPLOAD] Checking authentication...');
    const authed = await isAuthenticated();
    if (!authed) {
      console.log('❌ [CHUNKED-UPLOAD] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('✅ [CHUNKED-UPLOAD] Authentication successful');

    console.log('📝 [CHUNKED-UPLOAD] Parsing request data...');
    const data: ChunkData = await request.json();
    console.log('📝 [CHUNKED-UPLOAD] Request data parsed:', {
      chunkIndex: data.chunkIndex,
      totalChunks: data.totalChunks,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      uploadId: data.uploadId,
      chunkSize: data.chunk?.length || 0
    });
    
    const { chunk, chunkIndex, totalChunks, fileName, fileType, fileSize, uploadId } = data;

    // Validate required fields
    if (chunk === undefined || chunkIndex === undefined || totalChunks === undefined || !fileName || !fileType || !fileSize || !uploadId) {
      console.log('❌ [CHUNKED-UPLOAD] Missing required fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`📦 [CHUNKED-UPLOAD] Received chunk ${chunkIndex + 1}/${totalChunks} for ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      console.log(`❌ [CHUNKED-UPLOAD] File too large: ${fileSize} > ${MAX_FILE_SIZE}`);
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB` 
      }, { status: 413 });
    }

    // Validate file type
    if (!fileType.startsWith('image/')) {
      console.log(`❌ [CHUNKED-UPLOAD] Invalid file type: ${fileType}`);
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    // Initialize upload session if first chunk
    if (chunkIndex === 0) {
      console.log(`🆕 [CHUNKED-UPLOAD] Initializing upload session: ${uploadId}`);
      uploadSessions.set(uploadId, {
        chunks: new Array(totalChunks),
        fileName,
        fileType,
        fileSize,
        totalChunks,
        receivedChunks: 0
      });
      console.log(`🆕 [CHUNKED-UPLOAD] Upload session initialized: ${uploadId}`);
    }

    const session = uploadSessions.get(uploadId);
    if (!session) {
      console.log(`❌ [CHUNKED-UPLOAD] Upload session not found: ${uploadId}`);
      console.log(`🔍 [CHUNKED-UPLOAD] Available sessions:`, Array.from(uploadSessions.keys()));
      return NextResponse.json({ error: 'Upload session not found' }, { status: 400 });
    }

    console.log(`📥 [CHUNKED-UPLOAD] Processing chunk ${chunkIndex + 1}/${totalChunks}...`);
    
    // Store chunk
    try {
      const chunkBuffer = Buffer.from(chunk, 'base64');
      console.log(`📥 [CHUNKED-UPLOAD] Decoded chunk ${chunkIndex + 1}: ${chunkBuffer.length} bytes`);
      
      session.chunks[chunkIndex] = chunkBuffer;
      session.receivedChunks++;
      
      console.log(`📥 [CHUNKED-UPLOAD] Stored chunk ${chunkIndex + 1}/${totalChunks} (${session.receivedChunks}/${totalChunks} received)`);
    } catch (decodeError) {
      console.error(`❌ [CHUNKED-UPLOAD] Failed to decode chunk ${chunkIndex + 1}:`, decodeError);
      return NextResponse.json({ error: 'Failed to decode chunk data' }, { status: 400 });
    }

    // Check if all chunks received
    if (session.receivedChunks === totalChunks) {
      console.log(`🔗 [CHUNKED-UPLOAD] All chunks received, assembling file...`);
      
      try {
        // Combine all chunks
        const completeBuffer = Buffer.concat(session.chunks);
        console.log(`✅ [CHUNKED-UPLOAD] File assembled: ${(completeBuffer.length / 1024 / 1024).toFixed(2)}MB`);

        // Clean up session
        uploadSessions.delete(uploadId);
        console.log(`🧹 [CHUNKED-UPLOAD] Cleaned up session: ${uploadId}`);

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
      } catch (assemblyError) {
        console.error(`❌ [CHUNKED-UPLOAD] Failed to assemble or upload file:`, assemblyError);
        uploadSessions.delete(uploadId); // Clean up on error
        return NextResponse.json({ error: 'Failed to assemble or upload file' }, { status: 500 });
      }
    } else {
      // Return progress
      const progress = (session.receivedChunks / totalChunks) * 100;
      console.log(`📊 [CHUNKED-UPLOAD] Progress: ${progress.toFixed(1)}% (${session.receivedChunks}/${totalChunks})`);
      
      return NextResponse.json({ 
        complete: false,
        progress: progress,
        receivedChunks: session.receivedChunks,
        totalChunks: totalChunks
      });
    }

  } catch (error) {
    console.error('💥 [CHUNKED-UPLOAD] Unexpected error:', error);
    console.error('💥 [CHUNKED-UPLOAD] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process chunk' 
    }, { status: 500 });
  }
}