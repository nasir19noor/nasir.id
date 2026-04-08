'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, FolderOpen } from 'lucide-react';

interface PortfolioItem {
    id: number;
    project_title: string;
    description: string;
    image_url: string;
    images: string[];
    tech_stack: string[];
    live_link: string;
}

interface FormData {
    project_title: string;
    description: string;
    image_url: string;
    images: string[];
    tech_stack: string;
    live_link: string;
}

const emptyForm: FormData = {
    project_title: '',
    description: '',
    image_url: '',
    images: [],
    tech_stack: '',
    live_link: '',
};

export default function AdminPortfolioPage() {
    const [items, setItems] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<number | null>(null);
    const [form, setForm] = useState<FormData>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const fetchItems = useCallback(async () => {
        try {
            const res = await fetch('/api/portfolio', {
                cache: 'no-store',
                credentials: 'include'
            });
            if (res.status === 401) {
                window.location.href = '/admin/login';
                return;
            }
            if (!res.ok) {
                throw new Error('Failed to fetch');
            }
            const data = await res.json();
            setItems(data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load portfolio items');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setError('');
        setShowModal(true);
    };

    const openEdit = async (id: number) => {
        try {
            const res = await fetch(`/api/portfolio/${id}`, {
                cache: 'no-store',
                credentials: 'include'
            });
            if (!res.ok) {
                throw new Error('Failed to fetch portfolio item');
            }
            const data = await res.json();
            setEditing(id);
            setForm({
                project_title: data.project_title,
                description: data.description || '',
                image_url: data.image_url || '',
                images: data.images || [],
                tech_stack: (data.tech_stack || []).join(', '),
                live_link: data.live_link || '',
            });
            setError('');
            setShowModal(true);
        } catch (err) {
            console.error('Edit error:', err);
            setError('Failed to load portfolio item');
        }
    };

    const handleSave = async () => {
        if (!form.project_title) {
            setError('Project title is required');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const url = editing ? `/api/portfolio/${editing}` : '/api/portfolio';
            const method = editing ? 'PUT' : 'POST';

            const payload = {
                ...form,
                tech_stack: form.tech_stack
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                images: form.images,
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: 'Failed to save' }));
                throw new Error(data.error || 'Failed to save');
            }

            setShowModal(false);
            setForm(emptyForm);
            fetchItems();
        } catch (err) {
            console.error('Save error:', err);
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if (!res.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await res.json();
            setForm({ ...form, image_url: data.url });
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError('');

        try {
            const uploadedUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);

                const res = await fetch('/api/upload', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData,
                });

                if (!res.ok) {
                    throw new Error('Failed to upload image');
                }

                const data = await res.json();
                uploadedUrls.push(data.url);
            }

            setForm({ ...form, images: [...form.images, ...uploadedUrls] });
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload images');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index: number) => {
        const newImages = form.images.filter((_, i) => i !== index);
        setForm({ ...form, images: newImages });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this portfolio item?'))
            return;

        try {
            const res = await fetch(`/api/portfolio/${id}`, { 
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) {
                throw new Error('Failed to delete');
            }
            fetchItems();
        } catch (err) {
            console.error('Delete error:', err);
            setError('Failed to delete portfolio item');
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
                    <p className="text-gray-500 mt-1">
                        Manage your portfolio projects and case studies
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                    <Plus size={18} />
                    New Project
                </button>
            </div>

            {error && !showModal && (
                <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                    {error}
                </div>
            )}

            {/* Portfolio List */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : items.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                    <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No projects yet
                    </h3>
                    <p className="text-gray-500 mb-6">
                        Add your first portfolio project to get started.
                    </p>
                    <button
                        onClick={openCreate}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        Add Project
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-2xl border border-gray-200 p-6 hover:border-gray-300 transition-all"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {item.project_title}
                                    </h3>
                                    {item.description && (
                                        <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                                            {item.description}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {item.tech_stack.map((tech) => (
                                            <span
                                                key={tech}
                                                className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                    {item.live_link && (
                                        <a
                                            href={item.live_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            {item.live_link}
                                        </a>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openEdit(item.id)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Edit"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center pt-12 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {editing ? 'Edit Project' : 'New Project'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {error && (
                                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Project Title
                                </label>
                                <input
                                    type="text"
                                    value={form.project_title}
                                    onChange={(e) =>
                                        setForm({ ...form, project_title: e.target.value })
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Project name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Description (HTML)
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) =>
                                        setForm({ ...form, description: e.target.value })
                                    }
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                                    placeholder="<p>Describe this project using HTML...</p>"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Project Image
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                {uploading && (
                                    <p className="text-sm text-blue-600 mt-1">Uploading...</p>
                                )}
                                {form.image_url && (
                                    <div className="mt-2">
                                        <img
                                            src={form.image_url}
                                            alt="Preview"
                                            className="h-32 rounded-lg object-cover"
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Additional Images (Multiple)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleMultipleImagesUpload}
                                    disabled={uploading}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                {uploading && (
                                    <p className="text-sm text-blue-600 mt-1">Uploading images...</p>
                                )}
                                {form.images.length > 0 && (
                                    <div className="mt-2 grid grid-cols-4 gap-2">
                                        {form.images.map((url, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={url}
                                                    alt={`Image ${index + 1}`}
                                                    className="h-20 w-full rounded-lg object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Image URL
                                </label>
                                <input
                                    type="text"
                                    value={form.image_url}
                                    onChange={(e) =>
                                        setForm({ ...form, image_url: e.target.value })
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Tech Stack{' '}
                                    <span className="text-gray-400 font-normal">
                                        (comma separated)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={form.tech_stack}
                                    onChange={(e) =>
                                        setForm({ ...form, tech_stack: e.target.value })
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Kubernetes, Terraform, Docker, AWS"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Live Link
                                </label>
                                <input
                                    type="text"
                                    value={form.live_link}
                                    onChange={(e) =>
                                        setForm({ ...form, live_link: e.target.value })
                                    }
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                            >
                                <Save size={16} />
                                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
