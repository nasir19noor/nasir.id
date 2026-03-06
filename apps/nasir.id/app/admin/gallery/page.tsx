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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError('');
        setSuccess('');

        try {
            const uploadedImages: GalleryImage[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('file', file);

                const res = await fetch('/api/upload', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData,
                });

                if (!res.ok) {
                    throw new Error(`Failed to upload ${file.name}`);
                }

                const data = await res.json();
                uploadedImages.push({
                    url: data.url,
                    name: file.name,
                    size: file.size,
                    uploadedAt: new Date().toISOString(),
                });
            }

            const newImages = [...images, ...uploadedImages];
            saveImages(newImages);
            setSuccess(`Successfully uploaded ${uploadedImages.length} image(s)`);
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload images');
        } finally {
            setUploading(false);
            // Reset file input
            e.target.value = '';
        }
    };

    const deleteImage = (imageUrl: string) => {
        if (!confirm('Are you sure you want to remove this image from the gallery?')) return;
        
        const newImages = images.filter(img => img.url !== imageUrl);
        saveImages(newImages);
        setSuccess('Image removed from gallery');
        setTimeout(() => setSuccess(''), 3000);
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
                        Upload and manage your images ({images.length} total)
                    </p>
                </div>
                <label className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer">
                    <Upload size={18} />
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
                    Uploading images... Please wait.
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
                            className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
                        >
                            {/* Image */}
                            <div className="aspect-square relative overflow-hidden bg-gray-100">
                                <img
                                    src={image.url}
                                    alt={image.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                
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
                                        className="p-2 bg-red-500/80 backdrop-blur-sm rounded-lg hover:bg-red-600/80 transition-colors"
                                        title="Delete"
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