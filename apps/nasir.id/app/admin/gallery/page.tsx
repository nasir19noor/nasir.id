'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Copy, Eye, X, Image as ImageIcon, Search, Filter } from 'lucide-react';

interface GalleryImage {
    url: string;
    name: string;
    size: number;
    uploadedAt: string;
}

export default function AdminGalleryPage() {
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [filteredImages, setFilteredImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');

    // Load images from localStorage (simulating a gallery)
    useEffect(() => {
        const savedImages = localStorage.getItem('gallery-images');
        if (savedImages) {
            setImages(JSON.parse(savedImages));
        }
        setLoading(false);
    }, []);

    // Filter and sort images
    useEffect(() => {
        let filtered = images.filter(image =>
            image.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Sort images
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return b.size - a.size;
                case 'date':
                default:
                    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
            }
        });

        setFilteredImages(filtered);
    }, [images, searchTerm, sortBy]);

    // Save images to localStorage
    const saveImages = (newImages: GalleryImage[]) => {
        localStorage.setItem('gallery-images', JSON.stringify(newImages));
        setImages(newImages);
    };

    // Image resizing function
    const resizeImage = (file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                // Set canvas dimensions
                canvas.width = width;
                canvas.height = height;
                
                // Draw and compress image
                ctx?.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const resizedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            console.log(`🔄 [RESIZE] ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(resizedFile.size / 1024 / 1024).toFixed(2)}MB`);
                            resolve(resizedFile);
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    };

    // Chunked upload function for large files
    const uploadFileInChunks = async (file: File): Promise<{ url: string; sizes: any }> => {
        const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`📦 [CHUNKED] Starting chunked upload: ${file.name} (${totalChunks} chunks, ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        
        try {
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);
                
                console.log(`📤 [CHUNKED] Preparing chunk ${chunkIndex + 1}/${totalChunks} (${start}-${end}, ${chunk.size} bytes)`);
                
                // Convert chunk to base64
                const chunkBuffer = await chunk.arrayBuffer();
                const chunkBase64 = Buffer.from(chunkBuffer).toString('base64');
                
                console.log(`📤 [CHUNKED] Uploading chunk ${chunkIndex + 1}/${totalChunks} (${chunkBase64.length} base64 chars)`);
                
                const requestData = {
                    chunk: chunkBase64,
                    chunkIndex,
                    totalChunks,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    uploadId
                };
                
                console.log(`📤 [CHUNKED] Request data for chunk ${chunkIndex + 1}:`, {
                    chunkIndex,
                    totalChunks,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    uploadId,
                    chunkDataSize: chunkBase64.length
                });
                
                const response = await fetch('/api/upload/chunked', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(requestData),
                });
                
                console.log(`📥 [CHUNKED] Response for chunk ${chunkIndex + 1}: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ [CHUNKED] Chunk ${chunkIndex + 1} failed:`, {
                        status: response.status,
                        statusText: response.statusText,
                        errorText
                    });
                    
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { error: errorText || `HTTP ${response.status}` };
                    }
                    
                    throw new Error(errorData.error || `Chunk ${chunkIndex + 1} upload failed: ${response.status}`);
                }
                
                const result = await response.json();
                console.log(`📊 [CHUNKED] Chunk ${chunkIndex + 1} result:`, result);
                
                if (result.complete) {
                    console.log(`✅ [CHUNKED] Upload complete: ${file.name}`);
                    return { url: result.url, sizes: result.sizes };
                }
                
                // Update progress if needed
                if (result.progress !== undefined) {
                    console.log(`📊 [CHUNKED] Progress: ${result.progress.toFixed(1)}% (${result.receivedChunks}/${result.totalChunks})`);
                }
            }
            
            throw new Error('Upload completed but no final result received');
            
        } catch (error) {
            console.error('💥 [CHUNKED] Chunked upload failed:', error);
            throw error;
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Validate file sizes before upload
        const maxSize = 50 * 1024 * 1024; // 50MB
        const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);
        
        if (oversizedFiles.length > 0) {
            setError(`Some files are too large (max 50MB): ${oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join(', ')}`);
            e.target.value = ''; // Reset file input
            return;
        }

        // Validate file types
        const invalidFiles = Array.from(files).filter(file => !file.type.startsWith('image/'));
        
        if (invalidFiles.length > 0) {
            setError(`Some files are not images: ${invalidFiles.map(f => f.name).join(', ')}`);
            e.target.value = ''; // Reset file input
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        try {
            const uploadedImages: GalleryImage[] = [];
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < files.length; i++) {
                const originalFile = files[i];
                
                try {
                    console.log(`📤 [GALLERY] Processing ${i + 1}/${files.length}: ${originalFile.name} (${(originalFile.size / 1024 / 1024).toFixed(2)}MB)`);
                    
                    let fileToUpload = originalFile;
                    
                    // Resize image if larger than 1MB
                    if (originalFile.size > 1024 * 1024) {
                        console.log(`🔄 [GALLERY] Resizing large image: ${originalFile.name}`);
                        try {
                            fileToUpload = await resizeImage(originalFile, 1920, 0.8);
                            console.log(`✅ [GALLERY] Image resized: ${originalFile.name} (${(originalFile.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB)`);
                        } catch (resizeError) {
                            console.warn(`⚠️ [GALLERY] Failed to resize ${originalFile.name}, using original:`, resizeError);
                            fileToUpload = originalFile;
                        }
                    }
                    
                    let result;
                    
                    // Use regular upload for all files now (since they're resized)
                    console.log(`📤 [GALLERY] Uploading ${fileToUpload === originalFile ? 'original' : 'resized'} file: ${fileToUpload.name} (${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB)`);
                    
                    const formData = new FormData();
                    formData.append('file', fileToUpload);

                    const res = await fetch('/api/upload', {
                        method: 'POST',
                        credentials: 'include',
                        body: formData,
                    });

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({ error: 'Upload failed' }));
                        throw new Error(errorData.error || `HTTP ${res.status}`);
                    }

                    result = await res.json();

                    uploadedImages.push({
                        url: result.url,
                        name: originalFile.name, // Keep original filename
                        size: originalFile.size, // Keep original size for display
                        uploadedAt: new Date().toISOString(),
                    });
                    
                    successCount++;
                    console.log(`✅ [GALLERY] Upload ${i + 1} successful: ${originalFile.name}`);
                    
                } catch (uploadError) {
                    failCount++;
                    console.error(`❌ [GALLERY] Upload ${i + 1} failed: ${originalFile.name}`, uploadError);
                    
                    // Show individual file errors for debugging
                    if (files.length === 1) {
                        throw uploadError; // Re-throw for single file uploads
                    }
                }
            }

            if (uploadedImages.length > 0) {
                const newImages = [...images, ...uploadedImages];
                saveImages(newImages);
            }
            
            // Show results
            if (successCount > 0 && failCount === 0) {
                setSuccess(`Successfully uploaded ${successCount} image(s)`);
            } else if (successCount > 0 && failCount > 0) {
                setSuccess(`Uploaded ${successCount} image(s), ${failCount} failed`);
            } else {
                setError(`All uploads failed (${failCount} files)`);
            }
            
            // Clear messages after delay
            setTimeout(() => {
                setSuccess('');
                setError('');
            }, 8000);
            
        } catch (err) {
            console.error('💥 [GALLERY] Upload error:', err);
            let errorMessage = 'Failed to upload images';
            
            if (err instanceof Error) {
                if (err.message.includes('timeout') || err.name === 'AbortError') {
                    errorMessage = 'Upload timeout - try compressing your image or check your connection';
                } else if (err.message.includes('413') || err.message.includes('too large')) {
                    errorMessage = 'File too large - maximum size is 50MB';
                } else if (err.message.includes('network') || err.message.includes('fetch')) {
                    errorMessage = 'Network error - check your connection and try again';
                } else {
                    errorMessage = err.message;
                }
            }
            
            setError(errorMessage);
            setTimeout(() => setError(''), 10000);
        } finally {
            setUploading(false);
            // Reset file input
            e.target.value = '';
        }
    };

    const deleteImage = async (imageUrl: string) => {
        if (!confirm('Are you sure you want to permanently delete this image? This will remove it from S3 storage and cannot be undone.')) return;
        
        setDeleting(imageUrl);
        setError('');
        setSuccess('');
        
        try {
            console.log('🗑️ [GALLERY] Starting delete for URL:', imageUrl);
            
            // Call the delete API to remove from S3
            const response = await fetch('/api/gallery/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ imageUrl }),
            });
            
            console.log('🗑️ [GALLERY] Delete API response status:', response.status);
            
            const result = await response.json();
            console.log('🗑️ [GALLERY] Delete API response:', result);
            
            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}: Failed to delete image from S3`);
            }
            
            // Remove from local gallery storage
            const newImages = images.filter(img => img.url !== imageUrl);
            saveImages(newImages);
            
            // Show detailed success message
            const successMsg = `Image permanently deleted from S3 storage`;
            if (result.deletedKeys && result.deletedKeys.length > 0) {
                console.log('✅ [GALLERY] Successfully deleted keys:', result.deletedKeys);
                setSuccess(`${successMsg} (${result.deletedKeys.length} files removed)`);
            } else {
                setSuccess(successMsg);
            }
            
            // Show failed keys if any
            if (result.failedKeys && result.failedKeys.length > 0) {
                console.warn('⚠️ [GALLERY] Some files failed to delete:', result.failedKeys);
                setError(`Warning: ${result.failedKeys.length} file variants could not be deleted from S3`);
            }
            
            setTimeout(() => {
                setSuccess('');
                setError('');
            }, 5000);
            
        } catch (err) {
            console.error('❌ [GALLERY] Delete error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete image';
            setError(`Delete failed: ${errorMessage}`);
            setTimeout(() => setError(''), 8000);
        } finally {
            setDeleting(null);
        }
    };

    const copyImageUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        setSuccess('Image URL copied to clipboard');
        setTimeout(() => setSuccess(''), 3000);
    };

    const insertImageCode = (url: string, name: string) => {
        const imageHtml = `<img src="${url}" alt="${name.replace(/\.[^/.]+$/, '')}" style="max-width: 100%; height: auto;" />`;
        navigator.clipboard.writeText(imageHtml);
        setSuccess('Image HTML code copied to clipboard - paste it in your article editor');
        setTimeout(() => setSuccess(''), 5000);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
                    <p className="text-gray-500 mt-1">
                        Upload and manage your images ({images.length} total) • Auto-resize large images (&gt;1MB)
                    </p>
                </div>
                <label className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    <Upload size={18} />
                    {uploading ? 'Uploading...' : 'Upload Images'}
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                    />
                </label>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search images..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={20} className="text-gray-400" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'size')}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="date">Sort by Date</option>
                        <option value="name">Sort by Name</option>
                        <option value="size">Sort by Size</option>
                    </select>
                </div>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-green-600 text-sm">
                    {success}
                </div>
            )}

            {/* Upload Progress */}
            {uploading && (
                <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Processing and uploading images... Large files are automatically resized for faster upload</span>
                    </div>
                </div>
            )}

            {/* Gallery Grid */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading gallery...</div>
            ) : filteredImages.length === 0 && images.length > 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                    <Search size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No images found
                    </h3>
                    <p className="text-gray-500">
                        Try adjusting your search terms or filters.
                    </p>
                </div>
            ) : images.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                    <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No images in gallery
                    </h3>
                    <p className="text-gray-500 mb-6">
                        Upload your first images to get started.
                    </p>
                    <label className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer">
                        Upload Images
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredImages.map((image, index) => (
                        <div
                            key={index}
                            className={`group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all ${
                                deleting === image.url ? 'opacity-50 pointer-events-none' : ''
                            }`}
                        >
                            {/* Image */}
                            <div className="aspect-square relative overflow-hidden bg-gray-100">
                                <img
                                    src={image.url}
                                    alt={image.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                
                                {/* Deleting Overlay */}
                                {deleting === image.url && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                        <div className="text-white text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                            <p className="text-sm">Deleting...</p>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                    <button
                                        onClick={() => setSelectedImage(image.url)}
                                        className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
                                        title="View Full Size"
                                    >
                                        <Eye size={14} className="text-white" />
                                    </button>
                                    <button
                                        onClick={() => copyImageUrl(image.url)}
                                        className="p-2 bg-blue-500/80 backdrop-blur-sm rounded-lg hover:bg-blue-600/80 transition-colors"
                                        title="Copy URL"
                                    >
                                        <Copy size={14} className="text-white" />
                                    </button>
                                    <button
                                        onClick={() => insertImageCode(image.url, image.name)}
                                        className="p-2 bg-green-500/80 backdrop-blur-sm rounded-lg hover:bg-green-600/80 transition-colors"
                                        title="Copy HTML Code"
                                    >
                                        <ImageIcon size={14} className="text-white" />
                                    </button>
                                    <button
                                        onClick={() => deleteImage(image.url)}
                                        disabled={deleting === image.url}
                                        className={`p-2 backdrop-blur-sm rounded-lg transition-colors ${
                                            deleting === image.url 
                                                ? 'bg-gray-500/80 cursor-not-allowed' 
                                                : 'bg-red-500/80 hover:bg-red-600/80'
                                        }`}
                                        title={deleting === image.url ? "Deleting..." : "Delete"}
                                    >
                                        <Trash2 size={14} className="text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Image Info */}
                            <div className="p-3">
                                <p className="text-xs font-medium text-gray-900 truncate" title={image.name}>
                                    {image.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formatFileSize(image.size)}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {new Date(image.uploadedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Full Size Image Modal */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="relative max-w-4xl max-h-full">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={selectedImage}
                            alt="Full size preview"
                            className="max-w-full max-h-full object-contain rounded-lg"
                        />
                        <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                            <button
                                onClick={() => copyImageUrl(selectedImage)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-500/80 backdrop-blur-sm text-white rounded-lg hover:bg-blue-600/80 transition-colors text-sm"
                            >
                                <Copy size={16} />
                                Copy URL
                            </button>
                            <button
                                onClick={() => {
                                    const imageName = images.find(img => img.url === selectedImage)?.name || 'image';
                                    insertImageCode(selectedImage, imageName);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500/80 backdrop-blur-sm text-white rounded-lg hover:bg-green-600/80 transition-colors text-sm"
                            >
                                <ImageIcon size={16} />
                                Copy HTML
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}