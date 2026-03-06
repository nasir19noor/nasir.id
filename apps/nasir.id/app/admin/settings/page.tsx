'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { convertToAssetsUrl, addCacheBuster } from '@/lib/image-utils';

interface Settings {
    hero_title: string;
    hero_subtitle: string;
    hero_description: string;
    about_image: string;
    about_bio: string;
    tech_stack: string;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<Settings>({
        hero_title: '',
        hero_subtitle: '',
        hero_description: '',
        about_image: '',
        about_bio: '',
        tech_stack: '',
    });
    const [techStackArray, setTechStackArray] = useState<string[]>([]);
    const [newTech, setNewTech] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fixingUrls, setFixingUrls] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
                
                // Parse tech_stack JSON string to array
                if (data.tech_stack) {
                    try {
                        const parsed = JSON.parse(data.tech_stack);
                        setTechStackArray(Array.isArray(parsed) ? parsed : []);
                    } catch {
                        setTechStackArray([]);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
            setError('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        console.log('🔄 [ADMIN] Starting image upload:', file.name, file.size, 'bytes');
        
        setUploading(true);
        setError('');
        setSuccess('');

        // Store the current image URL as backup
        const previousImage = settings.about_image;
        console.log('💾 [ADMIN] Previous image URL:', previousImage);
        
        // Create preview URL for immediate display
        const previewUrl = URL.createObjectURL(file);
        console.log('👁️ [ADMIN] Created preview URL:', previewUrl);
        
        // Optimistically update UI with preview
        setSettings(prev => ({ ...prev, about_image: previewUrl }));

        try {
            const formData = new FormData();
            formData.append('file', file);

            console.log('📤 [ADMIN] Sending upload request...');
            const res = await fetch('/api/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            console.log('📥 [ADMIN] Upload response status:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('❌ [ADMIN] Upload failed with status:', res.status, errorText);
                throw new Error(`Upload failed: ${res.status} ${errorText}`);
            }

            const data = await res.json();
            console.log('✅ [ADMIN] Upload successful, response:', data);
            
            if (!data.url) {
                console.error('❌ [ADMIN] No URL in response:', data);
                throw new Error('No URL returned from upload');
            }

            // Clean up preview URL
            URL.revokeObjectURL(previewUrl);
            console.log('🧹 [ADMIN] Revoked preview URL');
            
            // Add cache busting parameter to ensure fresh image load
            const cacheBustUrl = data.url + '?t=' + Date.now();
            console.log('🔄 [ADMIN] Setting new image URL with cache bust:', cacheBustUrl);
            
            // Update with actual S3 URL
            setSettings(prev => ({ ...prev, about_image: cacheBustUrl }));
            setSuccess('Image uploaded successfully! 🎉');
            
            // Clear the file input to allow re-uploading the same file
            e.target.value = '';
            
        } catch (err) {
            console.error('💥 [ADMIN] Upload error:', err);
            
            // Clean up preview URL
            URL.revokeObjectURL(previewUrl);
            console.log('🧹 [ADMIN] Revoked preview URL after error');
            
            // Revert to previous image
            console.log('⏪ [ADMIN] Reverting to previous image:', previousImage);
            setSettings(prev => ({ ...prev, about_image: previousImage }));
            
            // Set detailed error message
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setError(`Failed to upload image: ${errorMessage}`);
            
            // Clear the file input
            e.target.value = '';
            
        } finally {
            setUploading(false);
            console.log('🏁 [ADMIN] Upload process completed');
        }
    };

    const addTech = () => {
        if (newTech.trim() && !techStackArray.includes(newTech.trim())) {
            setTechStackArray([...techStackArray, newTech.trim()]);
            setNewTech('');
        }
    };

    const removeTech = (index: number) => {
        setTechStackArray(techStackArray.filter((_, i) => i !== index));
    };

    // Drag and drop functions
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', index.toString());
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
        e.preventDefault();
        const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
        
        if (dragIndex === dropIndex) return;

        const newArray = [...techStackArray];
        const draggedItem = newArray[dragIndex];
        
        // Remove from old position
        newArray.splice(dragIndex, 1);
        // Insert at new position
        newArray.splice(dropIndex, 0, draggedItem);
        
        setTechStackArray(newArray);
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            // Convert tech stack array to JSON string before saving
            const settingsToSave = {
                ...settings,
                tech_stack: JSON.stringify(techStackArray),
            };

            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(settingsToSave),
            });

            if (!res.ok) {
                throw new Error('Failed to save settings');
            }

            setSuccess('Settings saved successfully! 🎉');
        } catch (err) {
            console.error('Save error:', err);
            setError('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const fixImageUrls = async () => {
        setFixingUrls(true);
        setError('');
        setSuccess('');
        
        try {
            const res = await fetch('/api/admin/fix-image-urls', {
                method: 'POST',
                credentials: 'include',
            });
            
            if (res.ok) {
                const result = await res.json();
                setSuccess('Image URLs fixed successfully! 🎉');
                console.log('🔧 [ADMIN] URL fix results:', result);
                
                // Refresh settings to show updated URLs
                await fetchSettings();
            } else {
                const errorData = await res.json();
                setError(errorData.error || 'Failed to fix image URLs');
            }
        } catch (err) {
            console.error('Fix URLs error:', err);
            setError('Failed to fix image URLs');
        } finally {
            setFixingUrls(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500">Loading settings...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                    Landing Page Settings ⚙️
                </h1>
                <p className="text-gray-600 mt-1">
                    Customize your landing page content and images
                </p>
            </div>

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

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-pink-100 p-6 space-y-6">
                {/* Hero Section */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Hero Section</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Title
                            </label>
                            <input
                                type="text"
                                value={settings.hero_title}
                                onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                placeholder="Your Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Subtitle
                            </label>
                            <input
                                type="text"
                                value={settings.hero_subtitle}
                                onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                placeholder="Your Title/Role"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Description
                            </label>
                            <textarea
                                value={settings.hero_description}
                                onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                                placeholder="Brief description about yourself"
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-pink-100" />

                {/* About Section */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">About Section</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Profile Image
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                            />
                            {uploading && (
                                <div className="flex items-center gap-2 text-sm text-blue-600 mt-1">
                                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                    Uploading image...
                                </div>
                            )}
                            {settings.about_image && (
                                <div className="mt-3">
                                    <img
                                        src={addCacheBuster(convertToAssetsUrl(settings.about_image))}
                                        alt="Profile"
                                        className="h-40 w-40 rounded-2xl object-cover border-4 border-pink-200"
                                        onLoad={() => console.log('🖼️ [ADMIN] Image loaded successfully:', convertToAssetsUrl(settings.about_image))}
                                        onError={(e) => {
                                            console.error('💥 [ADMIN] Image failed to load:', convertToAssetsUrl(settings.about_image));
                                            console.error('💥 [ADMIN] Image error event:', e);
                                        }}
                                        key={convertToAssetsUrl(settings.about_image)} // Force re-render when URL changes
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Current profile image
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1 font-mono break-all">
                                        {convertToAssetsUrl(settings.about_image)}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Bio
                            </label>
                            <textarea
                                value={settings.about_bio}
                                onChange={(e) => setSettings({ ...settings, about_bio: e.target.value })}
                                rows={5}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                                placeholder="Tell visitors about yourself..."
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-pink-100" />

                {/* Tech Stack Section */}
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Tech Stack & Tools</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Add Technology
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTech}
                                    onChange={(e) => setNewTech(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTech())}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                                    placeholder="e.g., React ⚛️, Node.js 🟢"
                                />
                                <button
                                    type="button"
                                    onClick={addTech}
                                    className="px-6 py-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
                                >
                                    Add
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Tip: Add emojis for a fun touch! (e.g., AWS ☁️, Docker 🐳)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Current Tech Stack ({techStackArray.length})
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                💡 Drag and drop to reorder
                            </p>
                            {techStackArray.length === 0 ? (
                                <p className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-xl">
                                    No technologies added yet
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {techStackArray.map((tech, index) => (
                                        <div
                                            key={index}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, index)}
                                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-50 to-blue-50 border-2 border-pink-200 rounded-full text-sm text-gray-700 font-medium group hover:border-pink-300 transition-colors cursor-move"
                                        >
                                            <span className="cursor-grab active:cursor-grabbing">⋮⋮</span>
                                            <span>{tech}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeTech(index)}
                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                title="Remove"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-between items-center pt-4">
                    <button
                        onClick={fixImageUrls}
                        disabled={fixingUrls}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl font-medium text-sm"
                    >
                        🔧 {fixingUrls ? 'Fixing URLs...' : 'Fix Image URLs'}
                    </button>
                    
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl font-medium"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
}