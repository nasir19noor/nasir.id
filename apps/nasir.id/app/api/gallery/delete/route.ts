import { NextRequest, NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';
import { isAuthenticated } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
    try {
        // Check authentication
        const authed = await isAuthenticated();
        if (!authed) {
            console.log('❌ [DELETE] Authentication failed');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { imageUrl } = await request.json();
        
        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
        }

        console.log('🗑️ [DELETE] Starting deletion for URL:', imageUrl);

        // Extract the S3 key from the assets URL
        // URL format: https://assets.nasir.id/uploads/2026/03/05/filename.jpg
        const urlParts = imageUrl.replace('https://assets.nasir.id/', '');
        console.log('🔍 [DELETE] URL parts after domain removal:', urlParts);
        
        if (!urlParts.startsWith('uploads/')) {
            console.log('❌ [DELETE] Invalid URL format, does not start with uploads/');
            return NextResponse.json({ error: 'Invalid image URL format' }, { status: 400 });
        }

        // Get the base filename without extension for thumbnail deletion
        const pathParts = urlParts.split('/');
        const filename = pathParts[pathParts.length - 1];
        const basePath = pathParts.slice(0, -1).join('/');
        console.log('📁 [DELETE] Path parts:', { filename, basePath });
        
        // Extract filename without extension and check for size suffixes
        const filenameParts = filename.split('.');
        const extension = filenameParts.pop();
        const baseFilename = filenameParts.join('.');
        console.log('📝 [DELETE] Filename parts:', { baseFilename, extension });
        
        // List of possible image sizes to delete
        const sizesToDelete = ['', '-large', '-medium', '-thumb'];
        const keysToDelete: string[] = [];
        
        // Add all possible size variants
        for (const size of sizesToDelete) {
            const key = `${basePath}/${baseFilename}${size}.${extension}`;
            keysToDelete.push(key);
        }
        
        console.log('🗑️ [DELETE] Keys to delete:', keysToDelete);
        console.log('🪣 [DELETE] Using bucket:', process.env.AWS_S3_BUCKET);
        
        // Delete all variants from S3
        const deletePromises = keysToDelete.map(async (key) => {
            try {
                console.log(`🗑️ [DELETE] Attempting to delete key: ${key}`);
                
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET!,
                    Key: key,
                });
                
                const result = await s3Client.send(deleteCommand);
                console.log(`✅ [DELETE] Successfully deleted: ${key}`, result);
                return { key, success: true };
            } catch (error) {
                console.error(`❌ [DELETE] Failed to delete ${key}:`, error);
                
                // Log more details about the error
                if (error instanceof Error) {
                    console.error(`❌ [DELETE] Error details for ${key}:`, {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    });
                }
                
                return { key, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        
        const results = await Promise.all(deletePromises);
        
        // Count successful deletions
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        console.log(`🗑️ [DELETE] Deletion complete: ${successCount} successful, ${failCount} failed`);
        
        return NextResponse.json({ 
            success: true, 
            message: `Deleted ${successCount} file variants from S3`,
            deletedKeys: results.filter(r => r.success).map(r => r.key),
            failedKeys: results.filter(r => !r.success).map(r => r.key)
        });
        
    } catch (error) {
        console.error('❌ [DELETE] Error deleting image:', error);
        return NextResponse.json(
            { error: 'Failed to delete image from S3' },
            { status: 500 }
        );
    }
}